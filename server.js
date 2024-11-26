const express = require('express');
const bodyParser = require('body-parser');
const puppeteer = require('puppeteer');
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(bodyParser.json());

// Serve static files for assets (e.g., images)
app.use('/assets', express.static(path.join(__dirname, 'assets')));

// Serve static files for generated outputs
app.use('/output', express.static(path.join(__dirname, 'output')));

// Convert an image to Base64 format
function imageToBase64(filePath) {
    const file = fs.readFileSync(filePath);
    return `data:image/png;base64,${file.toString('base64')}`;
}

// Endpoint to generate PDF
app.post('/generate-pdf', async (req, res) => {
    const {
        membershipNumber,
        nationalNumber,
        companyName,
        ownerName,
        address,
        branches,
        capital,
        category,
        sector,
        businessType,
        feesPaid,
        receiptNumber,
        issueDate,
        validUntil,
    } = req.body;

    if (
        !membershipNumber ||
        !nationalNumber ||
        !companyName ||
        !ownerName ||
        !address ||
        !branches ||
        !capital ||
        !category ||
        !sector ||
        !businessType ||
        !feesPaid ||
        !receiptNumber ||
        !issueDate ||
        !validUntil
    ) {
        return res.status(400).send('All fields are required.');
    }

    try {
        // Generate unique file names
        const uniqueId = Date.now();
        const pdfFilename = `${uniqueId}.pdf`;
        const pdfPath = path.join(__dirname, 'output', pdfFilename);
        const pdfUrl = `http://localhost:6000/output/${pdfFilename}`;

        // Generate QR Code for the PDF URL
        const qrCodeBase64 = await QRCode.toDataURL(pdfUrl);

        // Convert images to Base64
        const leftLogoBase64 = imageToBase64(path.join(__dirname, 'assets/left-logo.png'));
        const rightLogoBase64 = imageToBase64(path.join(__dirname, 'assets/right-logo.png'));
        const signatureBase64 = imageToBase64(path.join(__dirname, 'assets/signature.png'));
        const stampBase64 = imageToBase64(path.join(__dirname, 'assets/stamp.png'));
        const patternBase64 = imageToBase64(path.join(__dirname, 'assets/pattern.png')); // Pattern image

        // HTML template
        const htmlContent = `
            <!DOCTYPE html>
            <html lang="ar" dir="rtl">
            <head>
                <meta charset="UTF-8">
                <title>شهادة تسجيل</title>
                <style>
                    @page {
                        size: A4;
                        margin: 0;
                    }
                    body {
                        font-family: 'Arial', sans-serif;
                        margin: 0;
                        padding: 0;
                        direction: rtl;
                        position: relative;
                    }
                    .background {
                        position: absolute;
                        top: 50%;
                        left: 0%;
                        transform: translateY(-50%);
                        opacity: 0.15; /* Subtle opacity for pattern */
                    }
                    .background img {
                        width: 300px; /* Increased size for pattern */
                        height: auto;
                    }
                    .header {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        padding: 10px 40px;
                    }
                    .header img {
                        width: 120px; /* Adjusted logo size */
                    }
                    .title-bar {
                        background-color: #2C3E50;
                        color: white;
                        text-align: center;
                        padding: 15px 0;
                        font-size: 24px; /* Increased font size */
                    }
                    .year {
                        text-align: left;
                        font-size: 18px;
                        margin: 10px 40px;
                        color: #000;
                    }
                    .content {
                        padding: 0 40px;
                        font-size: 16px; /* Increased font size */
                        line-height: 2; /* Adjusted line height */
                    }
                    .left-section {
                        text-align: left;
                    }
                    .right-section {
                        margin-top: 20px;
                    }
                    .right-section p {
                        margin: 10px 0;
                    }
                    .footer {
                        display: flex;
                        justify-content: space-between;
                        align-items: flex-start;
                        padding: 20px 40px;
                    }
                    .footer .qr-code img {
                        width: 100px; /* Adjusted QR code size */
                    }
                    .footer .signature img {
                        width: 70px; /* Adjusted signature size */
                    }
                    .footer .stamp img {
                        width: 100px; /* Adjusted stamp size */
                    }
                    .footer .details {
                        text-align: center;
                    }
                    .footer-bottom {
                        display: flex;
                        justify-content: space-between;
                        padding: 0 40px;
                        margin-top: 20px;
                        font-size: 14px; /* Increased footer font size */
                        color: #7f8c8d;
                    }
                </style>
            </head>
            <body>
                <div class="background">
                    <img src="${patternBase64}" alt="Pattern">
                </div>
                <div class="header">
                    <img src="${leftLogoBase64}" alt="Left Logo">
                    <img src="${rightLogoBase64}" alt="Right Logo">
                </div>
                <div class="title-bar">
                    شهادة تسجيل للسنة المالية
                </div>
                <div class="year">
                    <p>التاريخ: 2024</p>
                </div>
                <div class="content">
                    <div class="left-section">
                        <p><strong>رقم العضوية:</strong> ${membershipNumber}</p>
                        <p><strong>الرقم الوطني للمنشأة:</strong> ${nationalNumber}</p>
                    </div>
                    <div class="right-section">
                        <p><strong>تشهد غرفة تجارة عمان:</strong></p>
                        <p>أن السيد / السادة: ${companyName}</p>
                        <p>مسجل / مسجلون لديها على النحو التالي:</p>
                        <p><strong>موقع العمل:</strong> ${address}</p>
                        <p><strong>الفروع:</strong> ${branches}</p>
                        <p><strong>رأس المال:</strong> ${capital} --- <strong>الفئة:</strong> ${category}</p>
                        <p><strong>القطاع التجاري:</strong> ${sector}</p>
                        <p><strong>نوع العمل:</strong> ${businessType}</p>
                    </div>
                </div>
                <div class="footer">
                    <div class="qr-code">
                        <img src="${qrCodeBase64}" alt="QR Code">
                    </div>
                    <div class="details">
                        <p><strong>الرسوم المدفوعة:</strong> ${feesPaid} دينار</p>
                    </div>
                    <div class="stamp">
                        <img src="${stampBase64}" alt="Stamp">
                        <p>التوقيع</p>
                    </div>
                </div>
                <div class="footer-bottom">
                    <div>صدرت في: ${issueDate}</div>
                    <div>ينتهي العمل بها: ${validUntil}</div>
                    <div>رقم سند القبض: ${receiptNumber}</div>
                </div>
            </body>
            </html>
        `;

        // Generate PDF
        const browser = await puppeteer.launch();
        const page = await browser.newPage();
        await page.setContent(htmlContent, { waitUntil: 'domcontentloaded' });
        await page.pdf({
            path: pdfPath,
            format: 'A4',
            printBackground: true,
        });

        await browser.close();

        res.status(200).json({
            message: 'PDF generated successfully',
            pdfDownloadUrl: pdfUrl,
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('An error occurred while generating the PDF.');
    }
});

app.listen(6000, () => {
    console.log('Server is running on http://localhost:6000');
});
