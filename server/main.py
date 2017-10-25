from config import config
from flask import Flask
from flask_cors import CORS
import logging
from manager_cloud_installer_svr import ardana
from manager_cloud_installer_svr import oneview
from manager_cloud_installer_svr import socket_proxy
from manager_cloud_installer_svr import socketio
from manager_cloud_installer_svr import suse_manager
from manager_cloud_installer_svr import ui

logging.basicConfig(level=logging.DEBUG)

LOG = logging.getLogger(__name__)
app = Flask(__name__,
            static_url_path='',
            static_folder='web')
app.register_blueprint(ardana.bp)
app.register_blueprint(ui.bp)
app.register_blueprint(oneview.bp)
app.register_blueprint(suse_manager.bp)
app.register_blueprint(socket_proxy.bp)
CORS(app)

@app.route('/')
def root():
    return app.send_static_file('index.html')

if __name__ == "__main__":

    flask_config = config.get_flask_config()
    port = flask_config.pop('PORT', 8081)
    host = flask_config.pop('HOST', '127.0.0.1')

    app.config.from_mapping(config.get_flask_config())

    # app.run(debug=True)
    socketio.init_app(app)
    socketio.run(app, host=host, port=port, use_reloader=True)
