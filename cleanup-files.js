/**
 * Script to delete all files except the 5 you want to keep
 * Run with: node cleanup-files.js
 */

const AWS = require('aws-sdk');

// Initialize DynamoDB
const dynamodb = new AWS.DynamoDB.DocumentClient({
  region: 'us-east-2',
});

// Files to KEEP - based on your requirements
const FILES_TO_KEEP = [
  'C Programming - Software Design', // pdf
  'Introduction to programming',     // pptx
  'C programming - Input And Output', // mp4
  'The Dog and His Bone Fable',       // mp3
  'Function Overloading'              // mp3
];

async function deleteUnwantedFiles() {
  try {
    console.log('🔍 Fetching all files from database...');
    
    // Scan all files
    const result = await dynamodb.scan({
      TableName: 'aitutor_files',
      ProjectionExpression: 'fileId, fileName, title, fileType, ragDocumentId, moduleId'
    }).promise();
    
    const allFiles = result.Items || [];
    console.log(`📊 Found ${allFiles.length} total files\n`);
    
    // Find files to delete
    const toDelete = allFiles.filter(file => {
      const name = file.fileName || file.title || '';
      return !FILES_TO_KEEP.some(keep => name.includes(keep));
    });
    
    console.log(`❌ Files to DELETE (${toDelete.length}):`);
    toDelete.forEach(f => {
      console.log(`   - ${f.fileName || f.title} (${f.fileType})`);
    });
    
    console.log(`\n✅ Files to KEEP (${FILES_TO_KEEP.length}):`);
    FILES_TO_KEEP.forEach(f => console.log(`   - ${f}`));
    
    if (toDelete.length === 0) {
      console.log('\n✓ No files to delete!');
      return;
    }
    
    // Confirm deletion
    console.log(`\n⚠️  About to delete ${toDelete.length} files. Continue? (y/n)`);
    
    // For automation, just proceed
    console.log('Proceeding with deletion...\n');
    
    let deleted = 0;
    for (const file of toDelete) {
      try {
        await dynamodb.delete({
          TableName: 'aitutor_files',
          Key: { fileId: file.fileId }
        }).promise();
        
        console.log(`✓ Deleted: ${file.fileName || file.title}`);
        deleted++;
      } catch (err) {
        console.error(`✗ Failed to delete ${file.fileId}:`, err.message);
      }
    }
    
    console.log(`\n✅ Cleanup complete! Deleted ${deleted} files.`);
    console.log(`📊 Files remaining: ${allFiles.length - deleted}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

deleteUnwantedFiles();
