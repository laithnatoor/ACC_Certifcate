import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.image import MIMEImage
from email.mime.base import MIMEBase
from email import encoders
from flask import Flask, request, jsonify
import logging

# Set up logging for debugging
logging.basicConfig(level=logging.DEBUG)

app = Flask(__name__)

SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = 587
SMTP_USERNAME = "Nintexartelco@gmail.com"
SMTP_PASSWORD = "szjihmmiermkezuu"  # Use your app-specific password

@app.route('/send-email', methods=['POST'])
def send_email():
    try:
        # Get the data from the incoming request
        data = request.get_json()

        # Extract relevant fields from the incoming JSON body
        recipient = data.get("to")
        subject = data.get("subject", "Test Email")
        message = data.get("message", "This is a test email.")
        image_path = data.get("image_path")  # Path to the signature image file
        attachment_path = data.get("attachment_path")  # Optional path to any other attachment

        if not recipient:
            return jsonify({"error": "Missing recipient email address"}), 400

        # Create the root message
        msg = MIMEMultipart()
        msg["Subject"] = subject
        msg["From"] = SMTP_USERNAME
        msg["To"] = recipient

        # Add the text message with a signature (as HTML for styling)
        html_message = f"""
        <html>
            <body>
                <p>{message}</p>
                <p>Best regards,<br>Amman Chamber Of Commerce</p>
                <p><img src="cid:signature_image"></p>
            </body>
        </html>
        """
        msg.attach(MIMEText(html_message, "html"))

        # Attach the signature image, if provided
        if image_path:
            try:
                with open(image_path, "rb") as img_file:
                    img = MIMEImage(img_file.read())
                    img.add_header("Content-ID", "<signature_image>")  # Match with src="cid:signature_image"
                    img.add_header("Content-Disposition", "inline")  # Inline display
                    msg.attach(img)  # Attach the image to the email
            except Exception as e:
                logging.error(f"Failed to attach image: {str(e)}")
                return jsonify({"error": f"Failed to attach image: {str(e)}"}), 500

        # Attach additional files if provided
        if attachment_path:  # Only attach if an attachment path is provided
            try:
                with open(attachment_path, "rb") as attachment:
                    part = MIMEBase("application", "octet-stream")
                    part.set_payload(attachment.read())
                    encoders.encode_base64(part)
                    part.add_header("Content-Disposition", f"attachment; filename={attachment_path.split('/')[-1]}")
                    msg.attach(part)
            except Exception as e:
                logging.error(f"Failed to attach file: {str(e)}")
                return jsonify({"error": f"Failed to attach file: {str(e)}"}), 500

        # Send the email
        try:
            with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
                server.ehlo()
                server.starttls()
                server.ehlo()
                server.login(SMTP_USERNAME, SMTP_PASSWORD)
                server.sendmail(SMTP_USERNAME, recipient, msg.as_string())
            logging.info(f"Email sent to {recipient} with subject '{subject}'")
            return jsonify({"message": "Email sent successfully!"}), 200
        except smtplib.SMTPException as e:
            logging.error(f"SMTP error occurred: {str(e)}")
            return jsonify({"error": f"SMTP error occurred: {str(e)}"}), 500
        except Exception as e:
            logging.error(f"Error sending email: {str(e)}")
            return jsonify({"error": f"Error sending email: {str(e)}"}), 500
    except Exception as e:
        logging.error(f"Unexpected error: {str(e)}")
        return jsonify({"error": f"Unexpected error: {str(e)}"}), 500


if __name__ == '__main__':
    app.run( host='0.0.0.0', port=5002)
