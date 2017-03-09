/*
 *
 * Copyright 2016 Michael A Updike
 *
 * Licensed under the Apache License, Version 2.0 (the 'License');
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an 'AS IS' BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */
window.app = window.app || {};
app.Utils = (function() {
	'use strict';

	/**
	 * Misc. utility methods
	 * @namespace Utils
	 */

	/**
	 * This global callback passes an error on failure.
	 * @callback errorCallback
	 * @param {string|null} error - description of failure
	 */

	/**
	 * This global callback passes a string, or error on failure.
	 * @callback stringCallback
	 * @param {string|null} error - description of failure
	 * @param {string} response - content of response
	 */

	/**
	 * This global callback passes an int, or error on failure.
	 *
	 * @callback intCallback
	 * @param {string|null} error - description of failure
	 * @param {int} value - integer value
	 */

	/**
	 * This global callback passes a boolean, or error on failure.
	 *
	 * @callback booleanCallback
	 * @param {string|null} error - description of failure
	 * @param {boolean} value - boolean value
	 */

	const MIN_IN_DAY = 60 * 24;

	const MILLIS_IN_DAY = MIN_IN_DAY * 60 * 1000;

	return {

		/**
		 * Number of minutes in a day
		 * @type {int}
		 * @memberOf Utils
		 */
		MIN_IN_DAY: MIN_IN_DAY,

		/**
		 * Number of milliseconds a in day
		 * @type {int}
		 * @memberOf Utils
		 */
		MILLIS_IN_DAY: MILLIS_IN_DAY,

		/**
		 * Get the Extension version
		 * @return {string} Extension version
		 * @memberOf Utils
		 */
		getVersion: function() {
			const manifest = chrome.runtime.getManifest();
			return manifest.version;
		},

		/**
		 * Get the major Chrome version
		 * @see http://stackoverflow.com/questions/4900436/detect-version-of-chrome-installed
		 * @return {int} Chrome major version
		 * @memberOf Utils
		 */
		getChromeVersion: function() {
			const raw = navigator.userAgent.match(/Chrom(e|ium)\/([0-9]+)\./);
			return raw ? parseInt(raw[2], 10) : false;
		},

		/**
		 * Get the full Chrome version
		 * @see http://stackoverflow.com/questions/4900436/detect-version-of-chrome-installed
		 * @return {string} Chrome version
		 * @memberOf Utils
		 */
		getFullChromeVersion: function() {
			const raw = navigator.userAgent;
			return raw ? raw : 'Unknown';
		},

		/**
		 * Get the OS as a human readable string
		 * @return {Promise.<string>} OS name
		 * @memberOf Utils
		 */
		getPlatformOS: function() {
			const chromep = new ChromePromise();
			return chromep.runtime.getPlatformInfo().then(function(info) {
				let output = 'Unknown';
				const os = info.os;
				switch (os) {
					case 'win':
						output = 'MS Windows';
						break;
					case 'mac':
						output = 'Mac';
						break;
					case 'android':
						output = 'Android';
						break;
					case 'cros':
						output = 'Chrome OS';
						break;
					case 'linux':
						output = 'Linux';
						break;
					case 'openbsd':
						output = 'OpenBSD';
						break;
					default:
						break;
				}
				return Promise.resolve(output);
			});
		},

		/**
		 * Determine if a String is null or whitespace only
		 * @param {string} str - string to check
		 * @return {boolean} true if str is whitespace (or null)
		 * @memberOf Utils
		 */
		isWhiteSpace: function(str) {
			return (!str || str.length === 0 || /^\s*$/.test(str));
		},

		/**
		 * Get a date string in time ago format
		 * @param {int} time - time since epoch in millis
		 * @return {string} Relative time format
		 * @memberOf Utils
		 */
		getRelativeTime: function(time) {
			return moment(time).fromNow() + ', ' + moment(time).format('h:mm a');
		},

		/**
		 * Get a JSON parsed value from localStorage
		 * @param {string} key - key to get value for
		 * @return {JSON|null} JSON object, null if key does not exist
		 * @memberOf Utils
		 */
		get: function(key) {
			let item = localStorage.getItem(key);
			if (item !== null) {
				item = JSON.parse(item);
			}
			return item;
		},

		/**
		 * Get a String value from localStorage
		 * @param {string} key - key to get value for
		 * @return {String|null} JSON object, null if key does not exist
		 * @memberOf Utils
		 */
		getString: function(key) {
			return localStorage.getItem(key);
		},

		/**
		 * JSON stringify and save a value to localStorage
		 * @param {string} key - key to set value for
		 * @param {Object|null} value - new value, if null remove item
		 * @memberOf Utils
		 */
		set: function(key, value) {
			if (value !== null) {
				localStorage.setItem(key, JSON.stringify(value));
			} else {
				localStorage.removeItem(key);
			}
		},

		/**
		 * Save a String value to localStorage
		 * @param {string} key - key to set value for
		 * @param {string|null} value - new value, if null remove item
		 * @memberOf Utils
		 */
		setString: function(key, value) {
			if (value !== null) {
				localStorage.setItem(key, value);
			} else {
				localStorage.removeItem(key);
			}
		},

		/**
		 * Are we saving clipboard contents
		 * @return {boolean} true if we should monitor clipboard
		 * @memberOf Utils
		 */
		isMonitorClipboard: function() {
			return app.Utils.get('monitorClipboard');
		},

		/**
		 * Has user enabled pushing to device
		 * @return {boolean} true if autoSend is enabled
		 * @memberOf Utils
		 */
		allowPush: function() {
			return app.Utils.get('allowPush');
		},

		/**
		 * Has user enabled autoSend option
		 * @return {boolean} true if autoSend is enabled
		 * @memberOf Utils
		 */
		isAutoSend: function() {
			return app.Utils.get('autoSend');
		},

		/**
		 * Are we signed in
		 * @return {boolean} true if signed in
		 * @memberOf Utils
		 */
		isSignedIn: function() {
			return this.get('signedIn');
		},

		/**
		 * Are we registered with fcm
		 * @return {boolean} true if registered
		 * @memberOf Utils
		 */
		isRegistered: function() {
			return this.get('registered');
		},

		/**
		 * Are we not registered with fcm
		 * @return {boolean} true if not registered
		 * @memberOf Utils
		 */
		notRegistered: function() {
			return !this.get('registered');
		},

		/** Get the extension's name
		 * @return {string}
		 * @memberOf Utils
		 */
		getExtensionName: function() {
			return 'chrome-extension://' + chrome.runtime.id;
		},

		/**
		 * Get a random string of the given length
		 * @param {int|null} len - length of generated string, 8 if null
		 * @return {string} a random string
		 * @memberOf Utils
		 *
		 */
		randomString: function(len) {
			const POSSIBLE =
				'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
			if (!len) {
				len = 8;
			}
			let text = '';
			for (let i = 0; i < len; i++) {
				text += POSSIBLE.charAt(Math.floor(Math.random() * POSSIBLE.length));
			}
			return text;
		},

	};
})(window);
