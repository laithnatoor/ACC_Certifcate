from flask import Flask

# Create a Flask application
app = Flask(__name__)

# Define a route for the API
@app.route('/hello', methods=['GET'])
def hello_world():
    return "Hello, World!"

# Run the application
if __name__ == '__main__':
    # Make the app accessible on your local network
    app.run(host='0.0.0.0', port=5000, debug=True)
