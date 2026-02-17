/**
 * Hard delete all files marked with status: 'DELETED'
 * Removes from both DynamoDB and S3
 * Run with: node hard-delete-deleted-files.js
 */

const AWS = require('aws-sdk');

// Initialize services
const dynamodb = new AWS.DynamoDB.DocumentClient({
  region: 'us-east-2',
});

const s3 = new AWS.S3({
  region: 'us-east-2',
});

const S3_BUCKET = 'aitutor-files'; // Update if different

async function hardDeleteDeletedFiles() {
  try {
    console.log('🔍 Fetching all DELETED files from database...');
    
    // Scan for files with status = DELETED
    const result = await dynamodb.scan({
      TableName: 'aitutor_files',
      FilterExpression: '#status = :deleted',
      ExpressionAttributeNames: {
        '#status': 'status'
      },
      ExpressionAttributeValues: {
        ':deleted': 'DELETED'
      },
      ProjectionExpression: 'fileId, fileName, title, fileType, s3Key, ragDocumentId, moduleId'
    }).promise();
    
    const deletedFiles = result.Items || [];
    console.log(`📊 Found ${deletedFiles.length} files marked as DELETED\n`);
    
    if (deletedFiles.length === 0) {
      console.log('✓ No deleted files to clean up!');
      return;
    }
    
    console.log('Files to PERMANENTLY DELETE:');
    deletedFiles.forEach((f, i) => {
      console.log(`   ${i + 1}. ${f.fileName || f.title} (${f.fileType})`);
    });
    
    console.log(`\n⚠️  About to PERMANENTLY DELETE ${deletedFiles.length} files from S3 and DynamoDB!`);
    console.log('Proceeding with hard deletion...\n');
    
    let s3Deleted = 0;
    let dbDeleted = 0;
    let failed = [];
    
    // Delete each file
    for (const file of deletedFiles) {
      try {
        // Delete from S3 if s3Key exists
        if (file.s3Key) {
          try {
            await s3.deleteObject({
              Bucket: S3_BUCKET,
              Key: file.s3Key
            }).promise();
            s3Deleted++;
            console.log(`✓ S3 deleted: ${file.s3Key}`);
          } catch (s3Err) {
            console.warn(`⚠️  S3 delete failed for ${file.s3Key}: ${s3Err.message}`);
          }
        }
        
        // Delete from DynamoDB
        await dynamodb.delete({
          TableName: 'aitutor_files',
          Key: { fileId: file.fileId }
        }).promise();
        
        dbDeleted++;
        console.log(`✓ DB deleted: ${file.fileName || file.title} (${file.fileId})`);
      } catch (err) {
        console.error(`✗ Failed to delete ${file.fileId}: ${err.message}`);
        failed.push({ fileId: file.fileId, error: err.message });
      }
    }
    
    console.log(`\n✅ Hard delete complete!`);
    console.log(`📊 S3 files removed: ${s3Deleted}`);
    console.log(`📊 Database records removed: ${dbDeleted}`);
    
    if (failed.length > 0) {
      console.log(`\n❌ Failed deletions: ${failed.length}`);
      failed.forEach(f => {
        console.log(`   - ${f.fileId}: ${f.error}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

hardDeleteDeletedFiles();
