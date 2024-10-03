import React, { useState } from 'react'

function FileUpload({relativePath, refreshPath }) {
  const [file, setFile] = useState(null)
  const token = localStorage.getItem("token");
  const handleFileChange = (event) => {
    setFile(event.target.files[0])
  }
const currentPath = '/'
  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!file) {
      alert('Please select a file first')
      return
    }

    const formData = new FormData()
    formData.append('folderPath', relativePath)
    formData.append('files', file)
    console.log('curp'+currentPath)
    try {
      const response = await fetch('/api/upload', {
        headers: {
            Authorization: `Bearer ${token}`, // Add your token
          },
        method: 'POST',
        body: formData,
      })

      if (response.ok) {
        alert('File uploaded successfully')
        refreshPath(relativePath)
      } else {
        alert('File upload failed')
      }
    } catch (error) {
      console.error('Error uploading file:', error)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <input type="file" onChange={handleFileChange} />
      <button type="submit">Upload</button>
    </form>
  )
}

export default FileUpload