(function() {

var history = {
    _id: 'history',
    _list: [],
    _wrap: function(type, text) {
        let d = new Date(),
            s = (n, f) => ('0'+n).slice(-(f||2)),
            domwrap = document.createElement('div'),
            domtext = document.createElement('span'),
            domtime = document.createElement('span');
        this._list.push(text);
        domwrap.className = type;
        domtext.className = 'text';
        domtext.innerHTML = text.join('<br/>');
        domtime.className = 'time';
        domtime.innerHTML = (
            '['
            +s(d.getHours())+':'
            +s(d.getMinutes())+':'
            +s(d.getSeconds())+'.'
            +s(d.getMilliseconds(), 3)
            +']'
        );
        domwrap.appendChild(domtext);
        domwrap.appendChild(domtime);
        return domwrap;
    },
    _add: function(dom) {
        let domlist = document.getElementById(this._id);
        domlist.appendChild(dom)
        filter();
        domlist.scrollTop = domlist.scrollHeight;
    },
    clear: function() {
        let dom = document.getElementById(this._id);
        while (dom.firstChild) {
            dom.removeChild(dom.firstChild);
        }
        this._list = [];
    },
    ok: function(...e) {
        this._add(this._wrap('ok', e));
    },
    log: function(...e) {
        this._add(this._wrap('log', e));
    },
    info: function(...e) {
        this._add(this._wrap('info', e));
    },
    warn: function(...e) {
        this._add(this._wrap('warn', e));
    },
    error: function(...e) {
        this._add(this._wrap('error', e));
    }
};
var mqtt = {
    max_retry: 3,
    connected: function() {
        if (!this._client) {
            history.error('MQTT not connect yet');
            return false;
        }
        return true;
    },
    _listen: function(channel) {
        if (!this.connected()) {
            return;
        }
        this._client.subscribe(channel, { qos: 1 });
    },
    addChannel: function(channel) {
        if (!channel || -1 !== this._channels.indexOf(channel)) {
            return;
        }
        history.ok('Subscribe topic ['+channel+']');
        this._channels.push(channel);
        this._listen(channel);
    },
    removeChannel: function(channel) {
        let index = this._channels.indexOf(channel);
        if (-1 === index) {
            history.warn('Channel not found', channel);
            return;
        }
        if (!this.connected()) {
            return;
        }
        history.warn('Unsubscribe topic ['+channel+']');
        this._client.unsubscribe(channel)
        this._channels.splice(index, 1);
    },
    disconnect: function() {
        if (this._client) {
            try {
                this._client.disconnect();
            } catch (e) {
                history.warn('MQTT disconnect failed', e);
            }
        } else {
            this._try = ((this._try||0)+1);
        }
        this._client = null;
        this._channels = [];
    },
    connect: function(host, port, username, password, account) {
        let empty = [];
        port = parseInt(port);
        if (!host) {
            empty.push('host');
        }
        if (!port) {
            empty.push('port');
        }
        if (!username) {
            empty.push('username');
        }
        if (!password) {
            empty.push('password');
        }
        if (!account) {
            empty.push('client ID');
        }
        if (empty.length) {
            history.error('Please set '+empty.join(','));
            return false;
        }
        this.disconnect();
        let client = new Paho.MQTT.Client(host, port, account);
        client.onConnectionLost = (response) => {
            history.warn('MQTT connection lost', response.errorMessage);
            if (this.max_retry < this._try) {
                history.error('MQTT re-connect failed');
                this._try = null;
                return;
            }
            this.disconnect();
            this.connect(host, port, username, password, account);
        };
        client.onMessageArrived = (msg) => {
            let topic = msg.destinationName,
                data = msg.payloadString;
            history.log(('Get message from ['+topic+']'), data);
        };
        client.connect({
            userName: username,
            password: password,
            onSuccess: () => {
                this._client = client;
                this._channels.forEach(this._listen);
                history.ok('MQTT connected');
            }
        });
        return true;
    },
    _send: function(target, text) {
        if (!this.connected()) {
            return false;
        }
        let msg = new Paho.MQTT.Message(text);
        msg.destinationName = target;
        msg.qos = 1;
        msg.retained = true;
        try {
            this._client.send(msg);
            return true;
        } catch (e) {
            return false;
        }
    },
    send: function(target, text) {
        if (this._send(target, text)) {
            history.ok(('Sent message to ['+target+']'), text);
        } else {
            history.error('Sent message failed', e);
        }
    },
    remove: function(target) {
        if (this._send(target, '')) {
            history.warn('Remove message of ['+target+']');
        } else {
            history.error('Remove message failed', e);
        }
    }
};
filter = () => {
    let str = document.getElementById('filter').value,
        cmp = str.toLowerCase();
    [].forEach.call(document.getElementById('history').childNodes, (dom, index) => {
        let text = history._list[index].join('<br/>');
        if (str && -1 !== text.toLowerCase().indexOf(cmp)) {
            dom.querySelector('.text').innerHTML = text
                .replace(new RegExp(
                    ('('+str.replace(/(\+|\*|\[|\]|\.)/, '\\$1')+')'),
                    'gi'), '<f>$1</f>'
                )
                .replace('[', '<i>[')
                .replace(']', ']</i>');
            dom.removeAttribute('hide');
        } else if (str) {
            dom.setAttribute('hide', '');
        } else {
            dom.querySelector('.text').innerHTML = text
                .replace('[', '<i>[')
                .replace(']', ']</i>');
            dom.removeAttribute('hide');
        }
    });
};
connect = () => {
    if (mqtt.connect(
        document.getElementById('host').value,
        document.getElementById('port').value,
        document.getElementById('username').value,
        document.getElementById('password').value,
        document.getElementById('client_id').value
    )) {
        mqtt.addChannel(document.getElementById('listen_channel').value);
    }
};

})();