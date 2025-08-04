import React, { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';

import Typography from '@mui/material/Typography';

import ReactFlowToPDFParser from '../utils/reactFlowToPDFParser';


const PDF_PAGE_SIZES = [
  { label: 'A4 Portrait', value: 'a4' },
  { label: 'A4 Landscape', value: 'a4' },
  { label: 'A3 Portrait', value: 'a3' },
  { label: 'A3 Landscape', value: 'a3' },
  { label: 'Letter Portrait', value: 'letter' },
  { label: 'Letter Landscape', value: 'letter' },
];

const OrientationOptions = [
  { label: 'Portrait', value: 'portrait' as const },
  { label: 'Landscape', value: 'landscape' as const },
];


/**
 * Create a parser for pdf content
 * Specifically for parsing react-flow content
 * 
 * Should be able to extract nodes and edges from a PDF
 * Nodes are already react components
 * Edges are SVG elements
 *
 * Should be able to hide various elements by ID
 *
 */
function PDFParser({ elementCopy }: { elementCopy: React.ReactNode }) {
  // passed in the copy of the element to the parsed
  

  const handleCreatePDF = (pageSize, orientation) => {
    // Logic to create PDF from the parsed React Flow content
    console.log('Creating PDF with the following content:', elementCopy);
    
    ReactFlowToPDFParser({
      flowNode: elementCopy,
      pageSize,
      orientation
    })
  };


  return (
    <Box>
      {/* this will render in a modal */}

      {/**
       * Should have a preview image inside of a rectangle matching the sheet size 
       * We can move the preview image around inside the bounds of the rectangle
       
      */}

      {/**
       *  Select the page size and orientation with Selects
      */}


        <Button variant="contained" color="primary" onClick={() => handleCreatePDF(size, orientation)}>
          Create PDF
        </Button>
      
    </Box>
  )

  
}

export default PDFParser;