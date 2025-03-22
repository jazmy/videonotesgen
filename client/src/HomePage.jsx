import { 
  Box, 
  Typography, 
  Paper,
  Container
} from '@mui/material';
import VideoUploadComponent from "./components/VideoUploadComponent";

const HomePage = () => {
  return (
    <Container maxWidth="md">
      <Box sx={{ mt: 4, mb: 6, textAlign: 'center' }}>
        <Typography 
          variant="h3" 
          component="h1" 
          gutterBottom 
          sx={{ 
            fontWeight: 700,
            color: 'primary.main',
            mb: 2
          }}
        >
          Video Notes Generator
        </Typography>
        <Typography 
          variant="h6" 
          component="p" 
          sx={{ 
            color: 'text.secondary',
            maxWidth: 600,
            mx: 'auto'
          }}
        >
          Automatically generate comprehensive notes from your videos
        </Typography>
      </Box>

      <Paper 
        elevation={0} 
        sx={{ 
          borderRadius: 3,
          overflow: 'hidden',
          border: '1px solid',
          borderColor: 'divider',
          mb: 8
        }}
      >
        <Box sx={{ p: { xs: 2, sm: 3 } }}>
          <VideoUploadComponent />
        </Box>
      </Paper>
    </Container>
  );
};

export default HomePage;
