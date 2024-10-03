import React from 'react'
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink } from '@chakra-ui/react'

const Breadcrumbs = ({ breadcrumb, onClick }) => {
  return (
    <Breadcrumb>
          {breadcrumb.map((crumb, index) => (
            <BreadcrumbItem key={index}>
              <BreadcrumbLink
                href="#"
                onClick={(e) => {
                  e.preventDefault(); // Prevent the default link behavior
                  onClick(crumb.path); // Call the click handler to update the current path
                }}
              >
                {crumb.name}
              </BreadcrumbLink>
            </BreadcrumbItem>
          ))}
        </Breadcrumb>
  )
}

export default Breadcrumbs