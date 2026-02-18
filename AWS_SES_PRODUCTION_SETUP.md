# AWS SES Production Access & Domain Verification Setup

## Part 1: Request Production Access from AWS SES Console

### Step 1: Open AWS SES Console
1. Go to [AWS SES Console](https://console.aws.amazon.com/ses/) → **us-east-2** region
2. Left sidebar → Click **Account dashboard**

### Step 2: Look for "Request Production Access"
You should see a section stating you're currently in **Sandbox mode** with an option to:
- **Request production access**
- Or **Send a production access request**

Click that button/link.

### Step 3: Fill in the Production Access Form
AWS SES Console now has an integrated form. Fill in:

**Sender Email Address:**
```
sibiyag@tut.ac.za
```

**Use Case Description:**
```
Production Access Request for TutorVerse Student Verification System

We are launching TutorVerse, a student tutoring platform for Tshwane University of Technology (TUT).

Purpose: Send automated email verification codes during student registration
Recipients: Students and staff at TUT (institutional email addresses)
Email Frequency: ~1-2 verification emails per user during registration
Sender Email: sibiyag@tut.ac.za

Content Type: Transactional (verification codes only)
Bounce/Complaint Rate: Expected <0.5% (we handle bounces and complaints properly)

This is an institutional application with internal users only.
```

**Expected Daily Email Volume:**
- Start with: 1,000 emails/day (can adjust based on student population)

**Website URL (if applicable):**
- Leave blank or enter your institution website

### Step 4: Submit the Request
- Click **Submit request** or **Request production access**
- AWS typically responds within **24 hours**
- You'll receive approval via email to your AWS account email

### Step 5: Confirmation
Once approved, you'll see:
- Email from AWS SES confirming approval
- Account dashboard shows **Production Access: Enabled**
- Sandbox restrictions are lifted
- You can send from `sibiyag@tut.ac.za` to **any** email address

---

## Part 2: Verify Your Domain (tut.ac.za)

### Why Domain Verification?
- More professional (emails come from `sibiyag@tut.ac.za`)
- Better deliverability
- Protects your domain reputation
- Required for production use

### Step 1: Add Domain to AWS SES

1. Go to [AWS SES Console](https://console.aws.amazon.com/ses/) → **us-east-2** region
2. Left sidebar → **Verified identities**
3. Click **Create identity**
4. Select **Domain**
5. Enter: `tut.ac.za`
6. Check **Generate DKIM tokens** (recommended for better deliverability)
7. Click **Create identity**

### Step 2: Get DNS Records from AWS

After clicking "Create identity", AWS displays:

**Three types of DNS records:**
1. **Domain Verification Record** (TXT)
2. **DKIM Records** (CNAME) - Usually 3 records
3. **DMARC Record** (optional but recommended)

**Copy all these records** - you'll need them for DNS setup.

### Step 3: Add Records to Your Domain's DNS Provider

Contact your TUT IT Department or domain administrator with these DNS records.

**They need to add to `tut.ac.za` DNS:**

#### Example DNS Records Format:
```
Type: TXT
Name: _amazonses.tut.ac.za
Value: [verification token from AWS]

Type: CNAME
Name: [DKIM token 1]._domainkey.tut.ac.za
Value: [DKIM value 1].dkim.amazonses.com

Type: CNAME
Name: [DKIM token 2]._domainkey.tut.ac.za
Value: [DKIM value 2].dkim.amazonses.com

Type: CNAME
Name: [DKIM token 3]._domainkey.tut.ac.za
Value: [DKIM value 3].dkim.amazonses.com
```

**Note:** AWS SES console shows the exact values—just copy/paste them.

### Step 4: Verify DNS Records in AWS

1. Go back to AWS SES Console → Verified identities
2. Select `tut.ac.za`
3. Scroll down to **Verification** section
4. Click **Verify Domain Identity** or wait for auto-detection
5. Status changes to **Verified** when DNS propagates (typically **24-48 hours**)

### Step 5: Confirmation

Once verified:
- Domain shows **Verified** status in AWS SES
- You can send from `sibiyag@tut.ac.za` to **any** email address
- Emails will have DKIM signature (improves deliverability)
- Your app is ready for production

---

## Timeline Summary

| Task | Duration | Blocker? |
|------|----------|----------|
| AWS Production Access Request | 24 hours | No - can develop while waiting |
| DNS Records Addition by IT | 1-3 days | Yes - need IT involvement |
| DNS Propagation | 24-48 hours | No - usually faster |
| **Total** | **2-5 days** | - |

---

## After Setup Complete

### Update Your Backend

Ensure `.env` has:
```
SES_SENDER_EMAIL=sibiyag@tut.ac.za
AWS_REGION=us-east-2
```

### Test Verification Flow

1. Restart backend: `npm run dev`
2. Register new user with any email (e.g., `testuser@gmail.com`)
3. Should receive verification code email from `sibiyag@tut.ac.za`
4. Complete verification

---

## Troubleshooting

**Problem:** Domain still shows "Not Verified" after 48 hours
- Check: Are all 3 DKIM records + TXT record added correctly?
- Check: DNS propagation with: `nslookup -type=TXT _amazonses.tut.ac.za`
- Contact: Your IT department to verify DNS entries

**Problem:** Emails still bouncing
- Ensure production access is approved (check AWS Support case)
- Check DKIM records are correct (AWS SES console shows exact values)
- Wait full 48 hours for DNS propagation

**Problem:** Emails marked as spam
- Once domain is verified, DKIM signature helps with this
- Consider adding SPF and DMARC records (can discuss with IT)

---

## Contact Information

**For DNS Setup:**
- Contact: TUT IT Department
- Domain: tut.ac.za
- Email to provide them: The DNS records from AWS SES console

**For AWS Questions:**
- AWS Support case ID: [will be in approval email]
- AWS Region: us-east-2
