<h1>Uploady File Manager</h1>

Uploady file manager is a web based file manager allowing uploading and downloading files, as well as creating shareable links for downloading files. 

There is also a server manager allowing you to add servers. These servers can be managed via SFTP and SSH. 

Main page of Uploady
![Screenshot 2024-10-14 134508](https://github.com/user-attachments/assets/e23dc828-39f6-489a-a930-b3cf16795a0a)
<img width="1071" alt="upmain" src="https://github.com/user-attachments/assets/bbafb6da-05da-48ef-8d4f-b55e9284d45b">

Shared Links:
![Screenshot 2024-10-14 134546](https://github.com/user-attachments/assets/2795129d-0343-4988-a4fa-383262fd8ce2)

Server manager and SFTP viewer:
![Screenshot 2024-10-14 135323](https://github.com/user-attachments/assets/7d0bcac5-47b5-4951-9114-942a7e441bea)

SSH:
![Screenshot 2024-10-14 134707](https://github.com/user-attachments/assets/71e06c8c-24d8-445f-95ce-77af5911e92c)

Text viewer / editor:
<img width="1070" alt="upeditor" src="https://github.com/user-attachments/assets/dc787ffa-bfde-475a-9265-df8df38f0dab">

To use:
Git clone the repository. 
Edit the .env file to modify username/pass. 
Create a folder named 'uploads' in the project directory. (this can be changed in the .env)
cd to client and run 'npm run build' to build client
You must also also have a mongoDB. The location is configured in .env
In main project directory, run 'npm start' to start application
