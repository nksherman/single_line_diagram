import { useState } from 'react'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'

import Display from './components/display'

import './App.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    <Paper>
      <Box>
        <Typography variant="h2">Single Line Diagram</Typography>
      </Box>
      <Box className="card">
        <Button variant="contained" onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </Button>
        <Typography>
          Edit <code>src/App.tsx</code> and save to test HMR Hello worlds.
        </Typography>
      </Box>
    <Display />
    </Paper>
  )
}

export default App
