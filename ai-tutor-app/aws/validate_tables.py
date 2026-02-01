#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import boto3
import json
import sys
import io

# Fix encoding for Windows
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

dynamodb = boto3.client('dynamodb', region_name='us-east-2')

# Expected tables from YAML
expected_tables = [
    'aitutor_users',
    'aitutor_lecturers',
    'aitutor_students',
    'aitutor_modules',
    'aitutor_files',
    'aitutor_departments',
    'aitutor_faculties',
    'aitutor_courses',
    'aitutor_campuses',
    'aitutor_chat_sessions',
    'aitutor_chat_messages',
    'aitutor_audit_logs'
]

# Expected primary keys from YAML
expected_keys = {
    'aitutor_users': {'hash': 'userId'},
    'aitutor_lecturers': {'hash': 'lecturerId'},
    'aitutor_students': {'hash': 'studentId'},
    'aitutor_modules': {'hash': 'moduleId'},
    'aitutor_files': {'hash': 'fileId'},
    'aitutor_departments': {'hash': 'departmentId'},
    'aitutor_faculties': {'hash': 'facultyId'},
    'aitutor_courses': {'hash': 'courseId'},
    'aitutor_campuses': {'hash': 'campusId'},
    'aitutor_chat_sessions': {'hash': 'sessionId'},
    'aitutor_chat_messages': {'hash': 'messageId'},
    'aitutor_audit_logs': {'hash': 'logId'}
}

print("=" * 80)
print("TUTORVERSE TABLE VALIDATION REPORT")
print("=" * 80)
print()

# Check which tables exist
response = dynamodb.list_tables()
existing_tables = response['TableNames']

aitutor_tables = [t for t in existing_tables if t.startswith('aitutor_')]
print(f"✓ Found {len(aitutor_tables)} aitutor_* tables in AWS")
print()

# Detailed analysis
issues = []
for table_name in expected_tables:
    print(f"TABLE: {table_name}")
    print("-" * 80)
    
    if table_name not in existing_tables:
        print(f"  ❌ TABLE MISSING - Needs to be created")
        issues.append(f"Missing table: {table_name}")
    else:
        try:
            table_desc = dynamodb.describe_table(TableName=table_name)['Table']
            
            # Check billing mode
            billing_mode = table_desc['BillingModeSummary']['BillingMode']
            print(f"  Billing Mode: {billing_mode} {'✓' if billing_mode == 'PAY_PER_REQUEST' else '⚠️ (Expected: PAY_PER_REQUEST)'}")
            
            # Check key schema
            key_schema = table_desc['KeySchema']
            hash_key = [k for k in key_schema if k['KeyType'] == 'HASH']
            range_key = [k for k in key_schema if k['KeyType'] == 'RANGE']
            
            actual_hash = hash_key[0]['AttributeName'] if hash_key else 'NONE'
            expected_hash = expected_keys[table_name]['hash']
            
            hash_match = actual_hash == expected_hash
            print(f"  Primary Key (Hash): {actual_hash} {'✓' if hash_match else '❌ (Expected: ' + expected_hash + ')'}")
            
            if range_key:
                print(f"  Primary Key (Range): {range_key[0]['AttributeName']}")
            
            # Check GSIs
            gsi_list = table_desc.get('GlobalSecondaryIndexes', [])
            print(f"  Global Secondary Indexes: {len(gsi_list)}")
            for gsi in gsi_list[:3]:  # Show first 3
                print(f"    - {gsi['IndexName']}")
            if len(gsi_list) > 3:
                print(f"    ... and {len(gsi_list) - 3} more")
            
            # Check PITR
            pitr = table_desc.get('PointInTimeRecoveryDescription', {}).get('PointInTimeRecoveryStatus')
            print(f"  Point-in-Time Recovery: {pitr if pitr else 'Not enabled'} {'✓' if pitr == 'ENABLED' else '⚠️'}")
            
            # Check Streams
            streams = table_desc.get('StreamSpecification', {})
            if streams.get('StreamEnabled'):
                print(f"  DynamoDB Streams: ENABLED ({streams.get('StreamViewType')}) ✓")
            else:
                print(f"  DynamoDB Streams: Not enabled ⚠️")
            
            # Item count
            item_count = table_desc.get('ItemCount', 0)
            print(f"  Items: {item_count}")
            
            # Potential key mismatch
            if not hash_match:
                issues.append(f"{table_name}: Hash key mismatch (has '{actual_hash}', expected '{expected_hash}')")
            
        except Exception as e:
            print(f"  ❌ ERROR: {str(e)}")
            issues.append(f"{table_name}: {str(e)}")
    
    print()

print("=" * 80)
print("SUMMARY")
print("=" * 80)

missing = [t for t in expected_tables if t not in existing_tables]
existing = [t for t in expected_tables if t in existing_tables]

print(f"✓ Existing tables: {len(existing)}/{len(expected_tables)}")
for t in existing:
    print(f"  ✓ {t}")

if missing:
    print(f"\n❌ Missing tables: {len(missing)}")
    for t in missing:
        print(f"  ❌ {t}")

if issues:
    print(f"\n⚠️  ISSUES FOUND:")
    for issue in issues:
        print(f"  - {issue}")
else:
    print(f"\n✓ All tables configured correctly")

print()
print("=" * 80)
print("DEPLOYMENT RECOMMENDATION")
print("=" * 80)

if not missing and not issues:
    print("""
✓ ALL TABLES EXIST AND ARE PROPERLY CONFIGURED
  
Action: SKIP CloudFormation deployment
  Tables are already in use and match YAML specification.
  No changes needed unless you want to add new columns or indexes.
    """)
elif missing:
    print(f"""
❌ MISSING {len(missing)} TABLE(S)

Action: DEPLOY CloudFormation
  Missing tables: {', '.join(missing)}
  CloudFormation will create all missing tables.
    """)
else:
    print("""
⚠️  CONFIGURATION MISMATCHES DETECTED

Action: REVIEW AND UPDATE
  Some tables have different schemas than expected.
  Options:
  1. Manually update table configurations in AWS
  2. Backup and delete existing tables, then deploy CloudFormation
  3. Update YAML to match existing schema
    """)
