const fs = require('fs');
const path = require('path');
const { createTranscriptDocumentFromJson } = require('../utils/documentProcessing');

async function processLineByLine(transcriptFilePath) {
    const fileStream = fs.createReadStream(transcriptFilePath);
    const readline = require('readline');
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    for await (const line of rl) {
        const splitLine = line.split('v=');
        if (splitLine.length > 1) {
            const youtubeId = splitLine[1].split('&')[0];
            return youtubeId;
        }
    }
    return '';
}

async function checkFileStatus(videoId) {
    try {
        const dirs = {
            video: path.join(__dirname, '../docs', videoId),
            markdown: path.join(__dirname, '../docs', videoId, 'markdown'),
            rtf: path.join(__dirname, '../docs', videoId, 'rtf'),
            html: path.join(__dirname, '../docs', videoId, 'html'),
            zip: path.join(__dirname, '../docs', videoId, 'zip')
        };

        const files = {
            rtf: path.join(dirs.rtf, 'transcript.rtf'),
            html: path.join(dirs.html, 'transcript.html'),
            markdown: path.join(dirs.markdown, 'transcript.md'),
            zip: path.join(dirs.zip, 'transcript.zip')
        };

        const status = {
            rtf: fs.existsSync(files.rtf),
            html: fs.existsSync(files.html),
            markdown: fs.existsSync(files.markdown),
            zip: fs.existsSync(files.zip)
        };

        const downloadUrls = {
            rtf: status.rtf ? `/download/notes/${videoId}` : null,
            html: status.html ? `/download/html/${videoId}` : null,
            markdown: status.markdown ? `/download/markdown/${videoId}` : null,
            zip: status.zip ? `/download/zip/${videoId}` : null
        };

        return {
            success: true,
            status,
            downloadUrls,
            message: 'File status retrieved successfully'
        };
    } catch (error) {
        console.error('Error checking file status:', error);
        throw error;
    }
}

async function generateNotes(videoId, format = 'text') {
    try {
        console.log('Generating notes for video:', videoId);
        videoId = videoId.replace(/[^0-9a-zA-Z._-]+/g, '');

        // Create folders if they don't exist
        const transcriptDirPath = path.resolve(__dirname, '../docs', videoId);
        const imagesDirPath = path.resolve(transcriptDirPath, 'images');
        
        await fs.promises.mkdir(transcriptDirPath, { recursive: true });
        await fs.promises.mkdir(imagesDirPath, { recursive: true });

        // Determine source and transcript path
        const isYoutube = await fs.promises.access(path.join(transcriptDirPath, 'youtubeTranscript.txt'))
            .then(() => true)
            .catch(() => false);

        const source = isYoutube ? 'youtube' : 'local';
        const transcriptFile = isYoutube ? 'youtubeTranscript.txt' : 'transcript.txt';
        const transcriptPath = path.join(transcriptDirPath, transcriptFile);

        // Read and process transcript
        const rawTranscript = await fs.promises.readFile(transcriptPath, 'utf8');
        if (!rawTranscript) {
            throw new Error('Raw transcript is undefined');
        }

        // Get YouTube ID if applicable
        const youtubeId = isYoutube ? await processLineByLine(transcriptPath) : '';

        // Generate document
        await createTranscriptDocumentFromJson(
            videoId,
            rawTranscript,
            source,
            youtubeId
        );

        // Check file status
        const fileStatus = await checkFileStatus(videoId);

        return {
            success: true,
            message: 'Notes generation started',
            videoId,
            status: fileStatus.status,
            downloadUrls: fileStatus.downloadUrls
        };
    } catch (error) {
        console.error('Error generating notes:', error);
        throw error;
    }
}

module.exports = {
    generateNotes,
    checkFileStatus
};
