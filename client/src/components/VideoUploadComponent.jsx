import { useState, useRef, useEffect } from "react";
import { 
    Button, 
    CircularProgress, 
    Typography, 
    Box, 
    Alert,
    Paper,
    IconButton,
    LinearProgress
} from "@mui/material";
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CloseIcon from '@mui/icons-material/Close';
import DownloadIcon from '@mui/icons-material/Download';

const API_BASE_URL = 'http://localhost:3000';

const VideoUploadComponent = () => {
    const [videoFile, setVideoFile] = useState(null);
    const [error, setError] = useState("");
    const [instruction, setInstruction] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [uploadResult, setUploadResult] = useState(null);
    const [processingProgress, setProcessingProgress] = useState(0);
    const [pollingActive, setPollingActive] = useState(false);
    const [processingComplete, setProcessingComplete] = useState(false);
    const [zipReady, setZipReady] = useState(false);

    // Effect for polling status
    useEffect(() => {
        let interval;
        if (pollingActive && uploadResult?.subfolder && !processingComplete) {
            interval = setInterval(async () => {
                try {
                    // Increment progress for visual feedback
                    setProcessingProgress(prev => Math.min(prev + 8, 95));
                    
                    // Check if transcript file exists
                    const transcriptResponse = await fetch(`${API_BASE_URL}/docs/${uploadResult.subfolder}/transcript.txt`);
                    
                    if (transcriptResponse.ok) {
                        // Processing complete - transcript exists
                        const transcriptText = await transcriptResponse.text();
                        setInstruction(transcriptText);
                        
                        // Set the download URL to the static file path
                        setUploadResult(prev => ({
                            ...prev,
                            message: 'Video processing complete',
                            downloadUrl: `${API_BASE_URL}/docs/${uploadResult.subfolder}/zip/transcript.zip`,
                            status: 'complete'
                        }));
                        
                        // Set progress to 100% and mark processing as complete
                        setProcessingProgress(100);
                        setProcessingComplete(true);
                        
                        // Check for zip file immediately
                        checkForZipFile(uploadResult.subfolder);
                        
                        // Stop polling for transcript
                        clearInterval(interval);
                        return;
                    }
                    
                    // Also try the status endpoint as a backup
                    const statusResponse = await fetch(`${API_BASE_URL}/v1/videos/status/${uploadResult.subfolder}`);
                    if (statusResponse.ok) {
                        const statusData = await statusResponse.json();
                        
                        if (statusData.status?.zip || statusData.status?.rtf || statusData.status?.markdown) {
                            // Try to get transcript again
                            try {
                                const transcriptResponse = await fetch(`${API_BASE_URL}/docs/${uploadResult.subfolder}/transcript.txt`);
                                if (transcriptResponse.ok) {
                                    const transcriptText = await transcriptResponse.text();
                                    setInstruction(transcriptText);
                                }
                            } catch (err) {
                                console.error('Error fetching transcript:', err);
                            }
                            
                            // Set the download URL to the static file path
                            setUploadResult(prev => ({
                                ...prev,
                                message: 'Video processing complete',
                                downloadUrl: `${API_BASE_URL}/docs/${uploadResult.subfolder}/zip/transcript.zip`,
                                status: 'complete'
                            }));
                            
                            // Set progress to 100% and mark processing as complete
                            setProcessingProgress(100);
                            setProcessingComplete(true);
                            
                            // Check for zip file immediately
                            checkForZipFile(uploadResult.subfolder);
                            
                            // Stop polling for transcript
                            clearInterval(interval);
                            return;
                        }
                    }
                } catch (err) {
                    console.error('Error checking status:', err);
                }
            }, 15000); // Poll every 15 seconds
        }
        
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [pollingActive, uploadResult]);

    // Function to check for zip file
    const checkForZipFile = async (subfolder) => {
        try {
            console.log('Checking for zip file...');
            
            // Try multiple approaches to check if zip file exists
            
            // Method 1: Direct HEAD request to static file
            try {
                const zipResponse = await fetch(`${API_BASE_URL}/docs/${subfolder}/zip/transcript.zip`, { method: 'HEAD' });
                if (zipResponse.ok) {
                    console.log('Zip file found via HEAD request to static file');
                    setZipReady(true);
                    setIsLoading(false);
                    setPollingActive(false);
                    return true;
                }
            } catch (err) {
                console.error('Error checking zip file via HEAD to static file:', err);
            }
            
            // Method 2: Check status endpoint
            try {
                const statusResponse = await fetch(`${API_BASE_URL}/v1/videos/status/${subfolder}`);
                if (statusResponse.ok) {
                    const statusData = await statusResponse.json();
                    if (statusData.status?.zip) {
                        console.log('Zip file found via status endpoint');
                        setZipReady(true);
                        setIsLoading(false);
                        setPollingActive(false);
                        return true;
                    }
                }
            } catch (err) {
                console.error('Error checking status endpoint:', err);
            }
            
            // Method 3: Try download endpoint
            try {
                const downloadResponse = await fetch(`${API_BASE_URL}/download/zip/${subfolder}`, { method: 'HEAD' });
                if (downloadResponse.ok) {
                    console.log('Zip file found via download endpoint');
                    setZipReady(true);
                    setIsLoading(false);
                    setPollingActive(false);
                    return true;
                }
            } catch (err) {
                console.error('Error checking download endpoint:', err);
            }
            
            // Method 4: Try to list files in the zip directory
            try {
                const listResponse = await fetch(`${API_BASE_URL}/v1/videos/list-files/${subfolder}/zip`);
                if (listResponse.ok) {
                    const listData = await listResponse.json();
                    if (listData.files && listData.files.includes('transcript.zip')) {
                        console.log('Zip file found via list-files endpoint');
                        setZipReady(true);
                        setIsLoading(false);
                        setPollingActive(false);
                        return true;
                    }
                }
            } catch (err) {
                console.error('Error checking list-files endpoint:', err);
            }
            
            return false;
        } catch (err) {
            console.error('Error in checkForZipFile:', err);
            return false;
        }
    };

    // Effect for checking zip file availability
    useEffect(() => {
        let zipCheckInterval;
        
        // Only start checking for zip file when processing is complete
        if (processingComplete && !zipReady && uploadResult?.subfolder) {
            // Check immediately first
            checkForZipFile(uploadResult.subfolder);
            
            zipCheckInterval = setInterval(async () => {
                const found = await checkForZipFile(uploadResult.subfolder);
                if (found) {
                    clearInterval(zipCheckInterval);
                }
            }, 15000); // Check every 15 seconds
        }
        
        return () => {
            if (zipCheckInterval) clearInterval(zipCheckInterval);
        };
    }, [processingComplete, zipReady, uploadResult]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!videoFile) {
            setError('Please select a video file');
            return;
        }

        try {
            setError('');
            setIsLoading(true);
            setUploadResult(null);
            setInstruction('');
            setProcessingProgress(0);
            setProcessingComplete(false);
            setZipReady(false);
            console.log('Starting upload and processing for:', videoFile.name);

            // Create form data
            const formData = new FormData();
            formData.append('video', videoFile);

            // Send to the new streamlined endpoint
            console.log('Sending upload request to processvideo endpoint');
            const response = await fetch(`${API_BASE_URL}/processvideo`, {
                method: 'POST',
                body: formData
            });

            console.log('Response status:', response.status);
            const responseText = await response.text();
            console.log('Raw response:', responseText);

            let responseData;
            try {
                responseData = JSON.parse(responseText);
                console.log('Parsed response:', responseData);
            } catch (err) {
                console.error('Failed to parse response:', err);
                throw new Error('Invalid response from server');
            }

            if (!response.ok) {
                throw new Error(responseData?.error || 'Failed to process video');
            }

            // Set initial processing status
            setUploadResult({
                message: 'Video uploaded and processing started',
                subfolder: responseData.subfolder,
                status: 'processing'
            });
            
            // Start polling for status updates
            setPollingActive(true);
            setProcessingProgress(10); // Start at 10%
            
        } catch (error) {
            console.error('Error:', error);
            setError(error.message || 'An error occurred');
            setIsLoading(false);
            setPollingActive(false);
        }
    };

    const fileInputRef = useRef(null);

    const handleFileSelect = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024 * 1024) { // 2GB
                setError('Video file size must not exceed 2GB');
                return;
            }
            console.log('File selected:', file.name);
            setVideoFile(file);
            setError('');
            setUploadResult(null);
            setProcessingComplete(false);
            setZipReady(false);
        }
    };

    // Function to handle download
    const handleDownload = () => {
        if (uploadResult?.subfolder && zipReady) {
            // Create a direct link to the download URL
            const downloadUrl = `${API_BASE_URL}/download/zip/${uploadResult.subfolder}`;
            
            // Create an anchor element
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = `${uploadResult.subfolder}-notes.zip`; // Suggested filename
            
            // Programmatically click the link
            document.body.appendChild(link);
            link.click();
            
            // Clean up
            document.body.removeChild(link);
        }
    };

    return (
        <Paper elevation={0} sx={{ p: 4, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
            <Typography variant="h4" component="h1" gutterBottom align="center" sx={{ 
                color: 'primary.main',
                fontWeight: 600,
                mb: 3
            }}>
                Upload Video
            </Typography>
            
            <Typography variant="body1" align="center" sx={{ mb: 4, color: 'text.secondary' }}>
                Videos must not exceed 2GB in size
            </Typography>

            <form onSubmit={handleSubmit}>
                <Box 
                    onClick={() => fileInputRef.current?.click()}
                    sx={{ 
                        border: '2px dashed',
                        borderColor: error ? 'error.main' : 'primary.main',
                        borderRadius: 2,
                        p: 4,
                        mb: 3,
                        textAlign: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        bgcolor: error ? 'error.light' : 'background.default',
                        '&:hover': {
                            bgcolor: error ? 'error.light' : 'action.hover'
                        }
                    }}
                >
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="video/*"
                        onChange={handleFileSelect}
                        style={{ display: 'none' }}
                        disabled={isLoading}
                    />

                    <CloudUploadIcon sx={{ 
                        fontSize: 48, 
                        color: error ? 'error.main' : 'primary.main', 
                        mb: 2 
                    }} />

                    {videoFile ? (
                        <Box>
                            <Typography variant="subtitle1" gutterBottom>
                                {videoFile.name}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                {(videoFile.size / (1024 * 1024)).toFixed(2)} MB
                            </Typography>
                        </Box>
                    ) : (
                        <Box>
                            <Typography variant="subtitle1" gutterBottom>
                                Drag and drop a video or click to browse
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Supported formats: MP4, MOV, AVI
                            </Typography>
                        </Box>
                    )}
                </Box>

                {error && (
                    <Alert 
                        severity="error" 
                        sx={{ mb: 3 }}
                        action={
                            <IconButton
                                aria-label="close"
                                color="inherit"
                                size="small"
                                onClick={() => setError('')}
                            >
                                <CloseIcon fontSize="inherit" />
                            </IconButton>
                        }
                    >
                        {error}
                    </Alert>
                )}

                <Button
                    type="submit"
                    variant="contained"
                    color="primary"
                    fullWidth
                    size="large"
                    disabled={!videoFile || isLoading}
                    sx={{ 
                        py: 1.5,
                        textTransform: 'none',
                        fontWeight: 600
                    }}
                >
                    {isLoading && !processingComplete ? (
                        <CircularProgress size={24} color="inherit" />
                    ) : (
                        'Generate Notes'
                    )}
                </Button>

                {/* Only show progress bar when loading and not complete */}
                {isLoading && !processingComplete && (
                    <Box sx={{ width: '100%', mt: 3 }}>
                        <LinearProgress variant="determinate" value={processingProgress} />
                        <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 1 }}>
                            Processing video... {processingProgress}%
                        </Typography>
                    </Box>
                )}

                {processingComplete && (
                    <Alert 
                        severity="success" 
                        sx={{ mt: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                    >
                        <span>Video processing complete!</span>
                        {zipReady ? (
                            <Button
                                variant="contained"
                                color="success"
                                size="medium"
                                onClick={handleDownload}
                                startIcon={<DownloadIcon />}
                                sx={{ ml: 2 }}
                            >
                                Download ZIP
                            </Button>
                        ) : (
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <CircularProgress size={20} sx={{ mr: 1 }} />
                                <Typography variant="body2">Preparing download...</Typography>
                            </Box>
                        )}
                    </Alert>
                )}

                {instruction && (
                    <Paper elevation={0} sx={{ mt: 3, p: 3, bgcolor: 'grey.50' }}>
                        <Typography variant="subtitle1" gutterBottom fontWeight={600}>
                            Generated Transcript:
                        </Typography>
                        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                            {instruction}
                        </Typography>
                    </Paper>
                )}
            </form>
        </Paper>
    );
};

export default VideoUploadComponent;
