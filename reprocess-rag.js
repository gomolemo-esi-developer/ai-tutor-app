const AWS = require('aws-sdk');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const s3 = new AWS.S3({ region: 'us-east-2' });
const dynamodb = new AWS.DynamoDB.DocumentClient({ region: 'us-east-2' });

const RAG_URL = 'http://localhost:8000';

async function reprocessDocument(fileId, ragDocumentId, fileName) {
  try {
    console.log(`\n🔄 Reprocessing: ${fileName}`);
    console.log(`   Document ID: ${ragDocumentId}`);
    
    // Get file from S3
    const s3Key = `uploads/${fileId}`;
    console.log(`   Downloading from S3: ${s3Key}`);
    
    const s3Object = await s3.getObject({
      Bucket: 'aitutor-files-production-975050334073',
      Key: s3Key
    }).promise();
    
    const fileBuffer = s3Object.Body;
    
    // Upload to RAG service
    const formData = new FormData();
    const blob = new Blob([fileBuffer], { type: 'application/octet-stream' });
    formData.append('file', blob, fileName);
    formData.append('document_id', ragDocumentId);  // Tell RAG to reindex with same ID
    
    console.log(`   Uploading to RAG...`);
    const response = await axios.post(`${RAG_URL}/educator/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    
    console.log(`   ✅ RAG reprocessing started`);
    console.log(`   Response:`, response.data.substring(0, 100));
    
  } catch (error) {
    console.error(`   ❌ Error:`, error.message);
  }
}

async function main() {
  try {
    // Get the second PDF
    const result = await dynamodb.scan({
      TableName: 'aitutor_files',
      FilterExpression: 'fileName = :name',
      ExpressionAttributeValues: { ':name': 'Intro-to-Python-Part-1.pdf' }
    }).promise();
    
    if (result.Items.length === 0) {
      console.log('❌ File not found');
      return;
    }
    
    const file = result.Items[0];
    console.log('📄 Found file:', file.fileName);
    console.log('   FileID:', file.fileId);
    console.log('   RAG DocumentID:', file.ragDocumentId);
    
    await reprocessDocument(file.fileId, file.ragDocumentId, file.fileName);
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

main();
