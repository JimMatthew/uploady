import React from 'react'
import { Box, SimpleGrid, Text, IconButton, Stack, Heading, HStack } from '@chakra-ui/react'
import { FaFolder, FaFile, FaDownload, FaTrash, FaShareAlt } from 'react-icons/fa'

const FileFolderViewer = ({ files, folders, onDownload, onDelete, onShare, onFolderClick }) => {
  return (
    <Box p={4}>
      {/* Heading */}
      <Heading size="md" mb={6}>
        File and Folder Viewer
      </Heading>

      {/* Folders */}
      {folders && folders.length > 0 && (
        <Box mb={6}>
          <Heading size="sm" mb={4}>Folders</Heading>
          <SimpleGrid
            spacing={4}
            templateColumns="repeat(auto-fill, minmax(150px, 1fr))"
          >
            {folders.map((folder, index) => (
              <Box
                key={index}
                borderWidth="1px"
                borderRadius="md"
                p={4}
                _hover={{ bg: 'gray.100', cursor: 'pointer' }}
                onClick={() => onFolderClick(folder.name)}
              >
                <HStack>
                  <FaFolder size={24} />
                  <Text fontWeight="bold">{folder.name}</Text>
                </HStack>
              </Box>
            ))}
          </SimpleGrid>
        </Box>
      )}

      {/* Files */}
      {files && files.length > 0 && (
        <Box>
          <Heading size="sm" mb={4}>Files</Heading>
          <SimpleGrid
            spacing={4}
            templateColumns="repeat(auto-fill, minmax(150px, 1fr))"
          >
            {files.map((file, index) => (
              <Box
                key={index}
                borderWidth="1px"
                borderRadius="md"
                p={4}
                _hover={{ bg: 'gray.100' }}
              >
                <Stack>
                  <HStack>
                    <FaFile size={24} />
                    <Text fontWeight="bold">{file.name}</Text>
                  </HStack>
                  <Text color="gray.500">{file.size} KB</Text>

                  {/* Action buttons */}
                  <HStack justify="space-between">
                    <IconButton
                      size="sm"
                      aria-label="Download File"
                      icon={<FaDownload />}
                      onClick={() => onDownload(file.name)}
                    />
                    <IconButton
                      size="sm"
                      aria-label="Share File"
                      icon={<FaShareAlt />}
                      onClick={() => onShare(file.name)}
                    />
                    <IconButton
                      size="sm"
                      aria-label="Delete File"
                      icon={<FaTrash />}
                      onClick={() => onDelete(file.name)}
                    />
                  </HStack>
                </Stack>
              </Box>
            ))}
          </SimpleGrid>
        </Box>
      )}
    </Box>
  )
}

export default FileFolderViewer