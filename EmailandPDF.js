const express = require('express');
const bodyParser = require('body-parser');
const puppeteer = require('puppeteer');
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

const app = express();
app.use(bodyParser.json());

// Serve static files for assets (e.g., images)
app.use('/assets', express.static(path.join(__dirname, 'assets')));

// Convert an image to Base64 format
function imageToBase64(filePath) {
    try {
        return fs.readFileSync(filePath).toString('base64');
    } catch (error) {
        console.error(`Error reading file at ${filePath}:`, error);
        return null;
    }
}

// PDF Generation Function
async function generatePDF(data) {
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
    } = data;

    const pdfPath = path.join(__dirname, 'output', `certificate_${Date.now()}.pdf`);

    // Generate QR Code for the PDF URL (Simulated link)
    const qrCodeBase64 = await QRCode.toDataURL("http://localhost:6000");

    // Convert images to Base64
    const leftLogoBase64 = imageToBase64(path.join(__dirname, 'assets/left-logo.png'));
    const rightLogoBase64 = imageToBase64(path.join(__dirname, 'assets/right-logo.png'));
    const signatureBase64 = imageToBase64(path.join(__dirname, 'assets/signature.png'));
    const stampBase64 = imageToBase64(path.join(__dirname, 'assets/stamp.png'));
    const patternBase64 = imageToBase64(path.join(__dirname, 'assets/pattern.png'));

    if (!leftLogoBase64 || !rightLogoBase64 || !signatureBase64 || !stampBase64 || !patternBase64) {
        throw new Error('One or more images could not be read. Ensure they exist in the assets folder.');
    }

    // HTML template for the PDF
    const htmlContent = `
        <!DOCTYPE html>
        <html lang="ar" dir="rtl">
        <head>
            <meta charset="UTF-8">
            <title>شهادة تسجيل</title>
            <style>
                @page { size: A4; margin: 0; }
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
                    opacity: 0.15;
                }
                .background img {
                    width: 300px;
                    height: auto;
                }
                .header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 10px 40px;
                }
                .header img {
                    width: 120px;
                }
                .title-bar {
                    background-color: #2C3E50;
                    color: white;
                    text-align: center;
                    padding: 15px 0;
                    font-size: 24px;
                }
                .year {
                    text-align: left;
                    font-size: 18px;
                    margin: 10px 40px;
                    color: #000;
                }
                .content {
                    padding: 0 40px;
                    font-size: 16px;
                    line-height: 2;
                }
                .footer {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    padding: 20px 40px;
                }
                .footer .qr-code img {
                    width: 100px;
                }
                .footer .details {
                    text-align: center;
                }
                .footer .stamp img {
                    width: 100px;
                }
                .footer .signature img {
                    width: 70px;
                }
                .footer-bottom {
                    display: flex;
                    justify-content: space-between;
                    padding: 0 40px;
                    margin-top: 20px;
                    font-size: 14px;
                    color: #7f8c8d;
                }
            </style>
        </head>
        <body>
            <div class="background">
                <img src="data:image/png;base64,${patternBase64}" alt="Pattern">
            </div>
            <div class="header">
                <img src="data:image/png;base64,${leftLogoBase64}" alt="Left Logo">
                <img src="data:image/png;base64,${rightLogoBase64}" alt="Right Logo">
            </div>
            <div class="title-bar">شهادة تسجيل للسنة المالية</div>
            <div class="year">
                <p>التاريخ: ${new Date().getFullYear()}</p>
            </div>
            <div class="content">
                <p><strong>رقم العضوية:</strong> ${membershipNumber}</p>
                <p><strong>الرقم الوطني للمنشأة:</strong> ${nationalNumber}</p>
                <p><strong>تشهد غرفة تجارة عمان:</strong> أن السيد / السادة: ${companyName}</p>
                <p><strong>مسجل / مسجلون لديها على النحو التالي:</strong></p>
                <p><strong>موقع العمل:</strong> ${address}</p>
                <p><strong>مالك العقار:</strong> ${ownerName}</p>
                <p><strong>الفروع:</strong> ${branches}</p>
                <p><strong>رأس المال:</strong> ${capital} --- <strong>الفئة:</strong> ${category}</p>
                <p><strong>القطاع التجاري:</strong> ${sector}</p>
                <p><strong>نوع العمل:</strong> ${businessType}</p>
            </div>
            <div class="footer">
                <div class="qr-code">
                    <img src="${qrCodeBase64}" alt="QR Code">
                </div>
                <div class="details">
                    <p><strong>الرسوم المدفوعة:</strong> ${feesPaid} دينار</p>
                </div>
                <div class="stamp">
                    <img src="data:image/png;base64,${stampBase64}" alt="Stamp">
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

    // Generate PDF using Puppeteer
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'domcontentloaded' });
    await page.pdf({ path: pdfPath, format: 'A4', printBackground: true });
    await browser.close();

    return pdfPath;
}

async function sendEmail(recipient, customerName, attachmentPath) {
    console.log("Preparing to send email...");
    console.log(`Recipient: ${recipient}`);
    console.log(`Attachment Path: ${attachmentPath}`);

    const transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 587,
        secure: false,
        auth: {
            user: "Nintexartelco@gmail.com",
            pass: "szjihmmiermkezuu", // App-specific password
        },
    });

    const patternBase64 = imageToBase64(path.join(__dirname, 'assets/pattern.png'));

    // Professional Email Body
    const htmlContent = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Certificate</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    margin: 0;
                    padding: 0;
                    background: #f9f9f9;
                }
                .email-container {
                    width: 100%;
                    background-image: url('data:image/png;base64,${patternBase64}');
                    background-size: cover;
                    background-repeat: no-repeat;
                    background-position: center;
                    padding: 20px;
                }
                .email-content {
                    background: #ffffff;
                    border-radius: 8px;
                    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 20px;
                }
                .header {
                    text-align: center;
                    border-bottom: 2px solid #007bff;
                    padding-bottom: 10px;
                }
                .header img {
                    width: 100px;
                    margin-bottom: 10px;
                }
                .header h1 {
                    font-size: 24px;
                    color: #333;
                    margin: 0;
                }
                .content {
                    margin-top: 20px;
                }
                .content p {
                    font-size: 16px;
                    line-height: 1.6;
                    color: #333;
                }
                .content p span {
                    font-weight: bold;
                    color: #007bff;
                }
                .footer {
                    text-align: center;
                    margin-top: 20px;
                    font-size: 14px;
                    color: #777;
                }
                .footer p {
                    margin: 0;
                }
            </style>
        </head>
        <body>
            <div class="email-container">
                <div class="email-content">
                    <div class="header">
                        <img src="data:image/png;base64,${imageToBase64(path.join(__dirname, 'assets/logo.png'))}" alt="Logo">
                        <h1>Certificate Issuance</h1>
                    </div>
                    <div class="content">
                        <p>Dear <span>${customerName}</span>,</p>
                        <p>We are pleased to inform you that your certificate has been successfully issued. Please find your certificate attached to this email for your reference.</p>
                        <p>Should you have any further questions or require assistance, please do not hesitate to contact us.</p>
                        <p>Thank you for choosing the Amman Chamber of Commerce.</p>
                    </div>
                    <div class="footer">
                        <p>Kind Regards,</p>
                        <p><strong>Amman Chamber of Commerce</strong></p>
                        <p>© ${new Date().getFullYear()} All rights reserved.</p>
                    </div>
                </div>
            </div>
        </body>
        </html>
    `;

    const mailOptions = {
        from: "Nintexartelco@gmail.com",
        to: recipient,
        subject: "Your Certificate from Amman Chamber of Commerce",
        html: htmlContent,
        attachments: [
            {
                filename: 'certificate.pdf',
                path: attachmentPath,
            },
        ],
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log("Email sent successfully.");
    } catch (error) {
        console.error("Error sending email:", error);
        throw new Error("Failed to send email.");
    }
}

// Combined API Endpoint
app.post('/send-email', async (req, res) => {
    try {
        const { email, customerName, messageBody, ...pdfData } = req.body;

        const pdfPath = await generatePDF(pdfData);
        await sendEmail(email, customerName, pdfPath);

        res.status(200).json({ message: 'Email sent successfully with PDF attachment!' });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'An error occurred while processing your request.' });
    }
});

// Start the server
app.listen(6000, () => {
    console.log('Server is running on http://localhost:6000');
});
