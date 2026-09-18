# Transfer Persistence Architecture

## Purpose

Uploady deliberately separates **transfer execution** from **durable
persistence**.

During an active transfer, the in-memory transfer executor is the
authoritative source of live execution state. Database state follows
asynchronously through semantic persistence events. Before a job is
considered complete, the persistence queue is flushed so all execution
events are durable and the final job state can be written.

This architecture exists primarily to prevent database
latency---especially synchronous SQLite writes on high-latency
storage---from becoming transfer latency.

The core model is:

``` text
Planning / expansion
        |
        | database is authoritative
        v
Canonical execution plan
        |
        v
Execution
        |
        | memory is authoritative for live state
        |
        +----> SSE / live progress
        |
        +----> persistence events
                    |
                    v
             persistence queue
                    |
                    v
            persistence service
                 /       \
                /         \
          item batch    job aggregate
               |             |
               +------+------+
                      |
                    stores
                  /        \
             SQLite        MongoDB
                |
          SQLite worker

Execution finishes
        |
        v
await queue.flush()
        |
        v
all execution events durable
        |
        v
persist final job state
        |
        v
jobDone
```

------------------------------------------------------------------------

## 1. Lifecycle and State Ownership

Authority intentionally changes during the lifetime of a transfer.

### Planning and Expansion

Before execution begins, Uploady creates the transfer job and its
initial items, expands directories, determines file sizes, creates child
items, removes directory placeholders where appropriate, and updates job
totals.

These operations are awaited.

``` text
Request
   |
   v
Create job and initial items
   |
   v
Expand directories / inspect files
   |
   v
Persist sizes and expanded items
   |
   v
Update totals
   |
   v
Reload canonical execution plan
```

At this stage, **the database is authoritative**.

Execution must not begin from a partially persisted plan because the
executor depends on the database representation being complete and
canonical.

### Active Execution

Once the execution plan has been loaded, **memory becomes authoritative
for live state**.

The executor knows what is happening right now. It performs file
operations and reports live progress through SSE without waiting for the
database to persist every per-file state transition.

Database state follows through the persistence queue.

### Finalization

When all transfer work has stopped, the executor waits for the
persistence queue to drain:

``` ts
await persistenceQueue.flush();
```

After the flush completes, all queued execution events are durable. The
final job state can then be persisted.

At that point, **the database becomes authoritative again**.

In shorthand:

``` text
DB authoritative
      |
   planning
      |
      v
Memory authoritative
      |
  execution
      |
      v
   flush()
      |
      v
DB authoritative
```

------------------------------------------------------------------------

## 2. Persistence Events

The transfer engine does not directly issue normal per-file database
updates while executing files.

Instead, it records **facts that have already occurred**.

Current persistence events are:

``` text
file_started
file_completed
file_failed
```

For example:

``` ts
{
  type: "file_completed",
  jobId,
  itemId,
  size,
  completedAt
}
```

means:

> This item completed successfully at this time and transferred this
> many bytes.

It does **not** mean:

> Execute a particular SQL statement or MongoDB operation.

That distinction is important.

The transfer engine owns transfer semantics. The persistence layer owns
how those semantics are represented in a particular database.

This keeps database-specific behavior out of the executor.

------------------------------------------------------------------------

## 3. Why the Persistence Queue Exists

Without the queue, execution would effectively behave like this:

``` text
Transfer file
    |
    v
Write item state to DB
    |
   await
    |
    v
Update job counters in DB
    |
   await
    |
    v
Transfer next file
```

Database latency would therefore become part of the critical transfer
path.

This was particularly noticeable with SQLite on HDD-backed storage.
Small writes had significant fixed latency even though the amount of
data being written was tiny.

The queue changes the relationship:

``` text
Transfer file
    |
    v
Enqueue persistence event
    |
    +----------------------> continue execution

Persistence queue
    |
    +----------------------> persist independently
```

`enqueue()` records work for persistence but does not wait for that work
to become durable.

------------------------------------------------------------------------

## 4. The Queue as a Cooperative Buffer

The queue is intentionally simple.

It is not primarily a timer-based batch collector. It is a **buffer
between a producer and a potentially slower consumer**.

When the first event arrives while the queue is idle, processing is
scheduled with `setImmediate()`.

When processing begins, the queue takes everything currently waiting:

``` ts
const batch = this.queue.splice(0, this.queue.length);
```

The persistence handler then processes that batch.

While persistence is busy, transfer execution remains free to continue
and may enqueue additional events.

Those new events accumulate in the queue and become the next batch.

### When Persistence Is Fast

If persistence keeps up with execution, batches naturally remain small:

``` text
event
  |
  v
[1]
  |
persist

event
  |
  v
[1]
  |
persist
```

### When Persistence Is Slow

If execution produces events faster than persistence can store them:

``` text
persist current batch
        |
        | DB busy
        |
        +---- new events arrive
                 |
                 v
           [e1 e2 e3 e4 ...]
                 |
        current batch finishes
                 |
                 v
         take entire backlog
```

The next batch therefore becomes larger automatically.

This creates natural cooperative batching:

-   Persistence faster than producer → tiny batches.
-   Persistence roughly equal to producer → small batches.
-   Persistence slower than producer → backlog grows and the next batch
    becomes larger.

There is currently no artificial batching delay and no arbitrary maximum
batch size.

That is intentional. The persistence system responds to actual
backpressure rather than trying to predict it with timing constants.

------------------------------------------------------------------------

## 5. Persistence Service

`TransferPersistenceQueue` is responsible for buffering and ordering
events.

It does not understand how those events map to item rows, job counters,
SQL, or MongoDB operations.

That responsibility belongs to `TransferPersistenceService`.

Conceptually:

``` text
TransferPersistenceEvent[]
          |
          v
TransferPersistenceService
          |
     +----+----+
     |         |
     v         v
Item batch   Job aggregate
```

The service walks the semantic events once and builds two persistence
representations.

### Item Batch

Item state remains item-specific.

A batch contains groups such as:

``` text
started[]
completed[]
failed[]
```

Semantically:

``` text
file_started
    -> item status IN_PROGRESS
    -> persist actual startedAt

file_completed
    -> item status COMPLETED
    -> persist actual completedAt
    -> persist file size

file_failed
    -> item status FAILED
    -> persist error
    -> persist actual failedAt
```

### Job Aggregate

Job-level state can be reduced across the entire batch.

For example:

``` text
latest file_started filename
    -> currentFile

number of file_completed events
    -> completedFiles delta

sum of completed sizes
    -> transferredBytes delta

number of file_failed events
    -> failedFiles delta
```

If a batch contains:

``` text
file_started A
file_completed A
file_started B
file_completed B
```

then the batch can persist:

``` text
currentFile       = B
completedFiles   += 2
transferredBytes += size(A) + size(B)
```

while still persisting the individual state of A and B.

This allows many semantic events to become relatively few actual
database operations.

------------------------------------------------------------------------

## 6. Store Boundary

The persistence service knows the domain-level persistence changes that
must occur, but it does not know how a particular database performs them
efficiently.

That remains behind the store interfaces.

``` text
Persistence Service
        |
        +--------------------+
        |                    |
        v                    v
TransferItemStore     TransferJobStore
        |                    |
        +---------+----------+
                  |
          database adapter
```

The same transfer persistence architecture therefore works with both
SQLite and MongoDB.

------------------------------------------------------------------------

## 7. SQLite Persistence

SQLite item persistence converts the item batch into multiple `UPDATE`
statements and sends them as a single transaction.

Conceptually:

``` text
Item batch
   |
   +-- started A
   +-- completed B
   +-- completed C
   +-- failed D
   |
   v
SQLite transaction
   |
   +-- UPDATE A
   +-- UPDATE B
   +-- UPDATE C
   +-- UPDATE D
   |
 COMMIT
```

The entire transaction is submitted through the SQLite adapter as one
logical worker request.

This is important because a transaction must not be implemented as
unrelated asynchronous worker messages such as:

``` text
BEGIN
UPDATE
UPDATE
COMMIT
```

Separate messages could theoretically interleave with other database
requests.

Instead:

``` text
main thread
    |
    | one transaction request
    v
SQLite worker
    |
   BEGIN
   UPDATE
   UPDATE
   ...
   COMMIT
```

The transaction is therefore executed synchronously and atomically
inside one worker operation.

Job-level persistence can normally be represented by one aggregated
`UPDATE`, so it does not require its own transaction.

------------------------------------------------------------------------

## 8. MongoDB Persistence

MongoDB uses the same semantic batches but implements them using
MongoDB-native mechanisms.

Item updates can be sent using `bulkWrite()`.

Conceptually:

``` text
Item batch
    |
    v
bulkWrite([
  update item A,
  update item B,
  update item C,
  ...
])
```

Job-level deltas can be represented with one `updateOne()` using
operations such as `$set` and `$inc`.

The transfer engine and persistence queue do not need to know that
MongoDB and SQLite implement the batch differently.

That is the purpose of the store abstraction.

------------------------------------------------------------------------

## 9. SQLite Worker Thread

SQLite has an additional implementation layer because both `bun:sqlite`
and `node:sqlite` expose synchronous database operations.

A synchronous SQLite operation on Uploady's main JavaScript thread could
block:

-   HTTP request handling
-   WebSocket handling
-   SSE progress delivery
-   transfer orchestration
-   other application work

Therefore the native SQLite connection lives in a dedicated worker
thread.

``` text
MAIN THREAD                         SQLITE WORKER

Store
  |
  v
SQLiteAdapter
  |
  | request message
  +--------------------------------> synchronous SQLite
                                         operation
  |                                         |
  | response message                        |
  <-----------------------------------------+
  |
Promise resolves
```

Callers still use normal asynchronous semantics:

``` ts
await db.run(...);
```

The caller therefore waits logically for the database operation when it
needs to, but the synchronous native operation blocks the SQLite worker
rather than Uploady's main event loop.

### Queue vs. Worker

The persistence queue and SQLite worker solve different problems.

**Persistence queue / batching**

-   removes normal per-file persistence from the transfer critical path;
-   buffers persistence work;
-   allows many semantic events to become fewer database operations.

**SQLite worker**

-   isolates synchronous SQLite work from the main event loop;
-   protects HTTP, SSE, WebSockets, and transfer orchestration from
    SQLite blocking;
-   also benefits ordinary SQLite operations outside the transfer
    subsystem.

They are complementary rather than redundant.

An important side effect is that the worker allows useful backlog to
form.

While SQLite is busy in the worker:

``` text
SQLite worker
    |
    | blocked doing DB work
    |
Main thread remains free
    |
    +-- transfer continues
    +-- events continue
    +-- queue grows
```

When SQLite becomes available again, the persistence queue can consume
the accumulated events as a larger batch.

------------------------------------------------------------------------

## 10. Event Timestamps

Persistence events carry the time at which the event actually occurred.

For example:

``` text
12:00:00.000  file completes
12:00:00.001  completion event queued
12:00:00.250  persistence begins
12:00:00.400  DB write completes
```

The persisted completion time should describe the transfer event:

``` text
12:00:00.000
```

not the later time at which the persistence subsystem happened to
process it.

Therefore events carry values such as:

``` text
startedAt
completedAt
failedAt
```

and the persistence layer stores those values.

MongoDB can persist JavaScript `Date` values directly when the schema
expects dates.

SQLite bind parameters cannot accept arbitrary JavaScript objects such
as `Date`, so the SQLite store converts those timestamps to an
SQLite-compatible representation, currently ISO strings, before sending
them to the worker.

------------------------------------------------------------------------

## 11. Flush as a Durability Barrier

`enqueue()` does not mean that an event is durable.

It means:

> This event has been accepted for ordered persistence.

Execution may therefore finish while the queue still contains events or
while a persistence batch is in progress.

Before final job completion, the executor calls:

``` ts
await persistenceQueue.flush();
```

`flush()` acts as a **durability barrier**.

It resolves only after the queue has drained successfully.

Conceptually:

``` text
Last transfer operation finishes
           |
           v
await persistenceQueue.flush()
           |
           | wait for active batch
           | wait for queued events
           v
All execution events durable
           |
           v
Persist final job state
           |
           v
jobDone
```

The intended contract is therefore:

``` text
jobDone
    =
transfer execution finished
    +
all queued persistence finished
    +
final job state persisted
```

This prevents Uploady from reporting a completed job while execution
state is still waiting in memory to be written.

------------------------------------------------------------------------

## 12. Queue Ordering

Persistence events are FIFO.

The queue processes events in the order they were enqueued.

A batch preserves that semantic ordering even when the persistence
service reduces multiple events into aggregate database changes.

For item state, individual item transitions remain represented.

For job-level state, intermediate values may be coalesced when only the
final meaning matters.

For example:

``` text
file_started A
file_started B
file_started C
```

does not require the job row to be written three separate times merely
to preserve transient `currentFile` values.

The final job-level state represented by that batch is:

``` text
currentFile = C
```

The persistence service may therefore coalesce that state while
preserving the meaning of the event sequence.

------------------------------------------------------------------------

## 13. Persistence Failure Semantics

If the persistence handler rejects while processing a batch, the queue
records the failure.

Once failed, the queue is considered poisoned.

The queue does not silently discard the error and continue as if
persistence were healthy.

After failure:

-   pending `flush()` waiters are rejected;
-   future `flush()` calls reject;
-   future `enqueue()` calls throw the stored failure;
-   normal persistence processing does not continue.

This is deliberate.

If durable persistence has failed, silently continuing execution would
make it impossible to know how far database state has diverged from
actual execution state.

Recovery from fatal executor errors, database failures, or application
crashes is a separate concern from the queue itself.

The queue's responsibility is to make persistence failure visible, not
to invent recovery semantics.

------------------------------------------------------------------------

## 14. Why Planning Writes Are Different

The asynchronous persistence model applies to **execution events**, not
every database operation in the transfer system.

Planning and expansion writes remain awaited because later execution
depends on their results.

For example:

``` text
directory placeholder
       |
       v
walk directory
       |
       v
discover files
       |
       v
persist expanded children
       |
       v
delete directory placeholder
       |
       v
reload execution plan
```

The executor cannot safely continue before these operations finish
because they define what the executor is supposed to execute.

Therefore:

``` text
Planning / expansion writes
    -> synchronous from executor's logical perspective
    -> await persistence

Execution state events
    -> asynchronous from executor's perspective
    -> enqueue persistence

Finalization
    -> synchronous durability barrier
    -> await flush()
```

------------------------------------------------------------------------

## 15. Observed Performance Behavior

This architecture was introduced after observing very high latency from
SQLite on HDD-backed storage.

The workload was not limited by disk throughput. Tiny writes had high
fixed latency.

One observed persistence sequence was approximately:

``` text
1 event   -> ~159 ms
35 events -> ~155 ms
```

While the first event was being persisted, transfer execution continued
and 35 more events accumulated.

The queue then consumed those 35 events as the next batch.

Instead of approximately paying the storage latency 36 separate times,
the persistence system paid it roughly twice.

Another mixed-file run naturally produced batches approximately like:

``` text
1 -> 2 -> 6 -> 16 -> 1
```

The changing batch sizes were not configured.

They emerged naturally from the relationship between transfer production
speed and persistence consumption speed.

This is the primary reason the queue currently uses opportunistic **take
everything currently waiting** batching rather than:

-   a fixed batching delay;
-   a target batch size;
-   a maximum wait timer;
-   database-specific tuning constants.

Do not add such policies merely because they appear more sophisticated.
Add them only if measured behavior demonstrates a concrete problem with
the current cooperative buffering model.

------------------------------------------------------------------------

## 16. Architectural Invariants

Future changes should preserve these rules unless the architecture is
intentionally redesigned.

1.  **Planning and expansion must produce a durable canonical execution
    plan before execution depends on it.**

2.  **During active execution, memory is authoritative for live state.**

3.  **Normal per-file persistence must not unnecessarily block transfer
    execution.**

4.  **Persistence events describe domain facts, not SQL or MongoDB
    commands.**

5.  **Persistence events must remain ordered.**

6.  **The persistence service may batch or aggregate events only when
    doing so preserves their semantic meaning.**

7.  **Event timestamps represent when transfer events occurred, not when
    persistence later processed them.**

8.  **Database-specific batching belongs behind store/adapter
    boundaries.**

9.  **The SQLite worker is an SQLite implementation detail and must not
    leak into transfer-engine semantics.**

10. **The SQLite worker and persistence queue solve different problems:
    event-loop isolation versus transfer/persistence decoupling and
    batching.**

11. **`enqueue()` does not imply durability.**

12. **`flush()` is the durability barrier between active execution and
    final job completion.**

13. **A job must not be reported as fully complete until queued
    persistence has successfully drained and final state has been
    persisted.**

14. **Persistence failures must be surfaced rather than silently
    ignored.**

------------------------------------------------------------------------

## 17. Mental Model

The shortest useful way to remember the architecture is:

> The persistence queue is a buffer between transfer execution and
> durable storage.

The executor produces semantic events.

The persistence system consumes them as quickly as the configured
database can accept them.

If the database keeps up, batches remain small.

If the database falls behind, events accumulate naturally and the next
persistence operation becomes a larger batch.

The SQLite worker ensures that SQLite can be slow without blocking
Uploady's main JavaScript event loop.

Finally, `flush()` reunites execution and persistence at the end of the
job and establishes the durability boundary before `jobDone`.

``` text
FAST / LIVE SIDE                         DURABLE SIDE

TransferExecutor
      |
      +---- SSE
      |
      +---- events ----> Queue ----> PersistenceService
                           |                 |
                           |             batch/reduce
                           |                 |
                           |                 v
                           |               Stores
                           |              /      \
                           |          SQLite    MongoDB
                           |             |
                           |           Worker
                           |
                           +---- buffer when durable side is busy


               At finalization:

Transfer complete ----> flush() ----> persistence caught up
                                         |
                                         v
                                  final job state
                                         |
                                         v
                                      jobDone
```
