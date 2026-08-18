const { extractPortalDataFromPayload } = require('./portalDataMapper');

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
                    "id": "payment_0",
                    "amount": "$416.67",
                    "total": "$416.67",
                    "date": "2026-08-06",
                    "sortDate": "2026-08-06T04:00:00.000Z",
                    "outstanding": "$0.00",
                    "payer": "",
                    "type": "Pledge",
                    "subType": "Annual Membership",
                    "method": "Cash",
                    "status": "Paid"
                }
            ],
            "pledges": [
                {
                    "id": "a2aJx0000031iWjIAI",
                    "amount": "$416.67",
                    "outstanding": "$0.00",
                    "total": "$416.67",
                    "paid": "$416.67",
                    "name": "Membership",
                    "purpose": "Annual Membership",
                    "parent": "",
                    "type": "Campaign",
                    "subType": "Annual Membership",
                    "date": "2026-10-06",
                    "status": "Success"
                },
                {
                    "id": "a2aJx0000031iRtIAI",
                    "amount": "$416.67",
                    "outstanding": "$0.00",
                    "total": "$416.67",
                    "paid": "$416.67",
                    "name": "Membership",
                    "purpose": "Annual Membership",
                    "parent": "",
                    "type": "Campaign",
                    "subType": "Annual Membership",
                    "date": "2026-09-06",
                    "status": "Success"
                },
                {
                    "id": "a2aJx0000031iJpIAI",
                    "amount": "$416.67",
                    "outstanding": "$0.00",
                    "total": "$416.67",
                    "paid": "$416.67",
                    "name": "Membership",
                    "purpose": "Annual Membership",
                    "parent": "",
                    "type": "Campaign",
                    "subType": "Annual Membership",
                    "date": "2026-08-06",
                    "status": "Success"
                },
                {
                    "id": "a2aJx0000031iIDIAY",
                    "amount": "$4583.37",
                    "outstanding": "$3333.36",
                    "total": "$4583.37",
                    "paid": "$1250.01",
                    "name": "Membership",
                    "purpose": "Campaign",
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

const result = extractPortalDataFromPayload(samplePayload.sfData);
console.log('Resulting Payments Count:', result.payments.length);
console.log('Payments:', JSON.stringify(result.payments, null, 2));
console.log('Resulting Pledges Count:', result.pledges.length);
console.log('Pledges:', JSON.stringify(result.pledges, null, 2));
