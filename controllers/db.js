const mongoose = require('mongoose')

const connectDB = async () => {
    
    mongoose.set("strictQuery", false);
    const mongoDB = "mongodb://192.168.1.237:27017/filem";
    await mongoose.connect(mongoDB)
}

module.exports = connectDB;