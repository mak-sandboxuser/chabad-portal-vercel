import { getPayments, getPledges } from './src/utils/portalData.js';

const samplePayload = {
    "success": true,
    "user": {
        "id": "anu@mailinator.com",
        "email": "anu@mailinator.com",
        "role": "Member",
        "name": "Anu Anu"
    },
    "sfData": {
        "contactId": "003Jx00001eIyhKIAS",
        "accountId": "001Jx00001sLcfNIAS",
        "financials": {
            "fromSalesforce": true,
            "totalPayments": 416.67,
            "payments": [
                {
                    "id": "a2aJx0000031iWjIAI",
                    "amount": "$416.67",
                    "total": "$416.67",
                    "date": "2026-10-06",
                    "sortDate": "2026-10-06",
                    "outstanding": "$0.00",
                    "payer": "",
                    "type": "Campaign",
                    "subType": "Annual Membership",
                    "method": "",
                    "status": "Paid"
                },
                {
                    "id": "a2aJx0000031iRtIAI",
                    "amount": "$416.67",
                    "total": "$416.67",
                    "date": "2026-09-06",
                    "sortDate": "2026-09-06",
                    "outstanding": "$0.00",
                    "payer": "",
                    "type": "Campaign",
                    "subType": "Annual Membership",
                    "method": "",
                    "status": "Paid"
                },
                {
                    "id": "a2aJx0000031iJpIAI",
                    "amount": "$416.67",
                    "total": "$416.67",
                    "date": "2026-08-06",
                    "sortDate": "2026-08-06",
                    "outstanding": "$0.00",
                    "payer": "",
                    "type": "Campaign",
                    "subType": "Annual Membership",
                    "method": "",
                    "status": "Paid"
                }
            ],
            "pledges": [
                {
                    "id": "a2aJx0000031iIDIAY",
                    "amount": "$4583.37",
                    "outstanding": "$3333.36",
                    "total": "$4583.37",
                    "paid": "$1250.01",
                    "name": "Membership",
                    "purpose": "Annual Membership",
                    "parent": "",
                    "type": "Campaign",
                    "subType": "Annual Membership",
                    "date": "2026-08-06",
                    "status": "Active"
                }
            ]
        }
    }
};

const payments = getPayments(samplePayload.sfData);
console.log('Frontend getPayments count:', payments.length);
console.log('Frontend Payments:', JSON.stringify(payments, null, 2));
