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
app.User = (function() {
	'use strict';

	/**
	 * Manage the current user
	 * @namespace User
	 */

	const ERROR_ALREADY_SIGNED_IN = 'Already signed in';

	/**
	 * Event: Fired when signin state changes for an account on the user's
	 *     profile.
	 * @see https://developer.chrome.com/apps/identity#event-onSignInChanged
	 * @param {object} account - chrome AccountInfo
	 * @param {boolean} signedIn - true if signedIn
	 * @private
	 * @memberOf User
	 */
	function _onSignInChanged(account, signedIn) {
		const uid = app.Utils.get('uid');
		if (app.Utils.isSignedIn() && !signedIn && (account.id == uid)) {
			// our user signed out of Chrome while we were signed in
			app.Utils.set('needsCleanup', true);
			app.Utils.set('signedIn', false);
			app.Utils.set('registered', false);
			app.Utils.set('cleanupRegToken', app.Utils.get('regToken'));
			app.Fb.signOut();
		}
		app.User.setInfo().catch((error) => {});
	}

	/**
	 * Listen for changes to Browser sign-in
	 */
	chrome.identity.onSignInChanged.addListener(_onSignInChanged);

	return {

		/**
		 * SignIn with OAuth 2.0 and firebase
		 * @return {Promise<void>}
		 * @memberOf User
		 */
		signIn: function() {
			if (app.Utils.isSignedIn()) {
				return Promise.reject(new Error(ERROR_ALREADY_SIGNED_IN));
			}

			return app.User.getAuthToken(true).then((token) => {
				return app.Fb.signIn(token);
			}).then((user) => {
				app.Utils.set('signedIn', true);
				if (!app.Utils.isWhiteSpace(user.photoURL)) {
					app.Utils.set('photoURL', user.photoURL);
				}
				return Promise.resolve();
			});
		},

		/**
		 * Sign-out of firebase
		 * @return {Promise<void>}
		 * @memberOf User
		 */
		signOut: function() {
			if (!app.Utils.isSignedIn()) {
				return Promise.resolve();
			}

			return app.Fb.signOut().then(() => {
				app.Utils.set('signedIn', false);
				app.Utils.set('photoURL', '');
				return Promise.resolve();
			});
		},


		/**
		 * Sign in and register {@link Device}
		 * @return {Promise.<void>}
		 * @memberOf User
		 */
		addAccess: function() {

			/**
			 * Cleanup if user signed-out of Browser
			 * @return {Promise.<void>}
			 * @memberOf User
			 */
			function ifCleanup() {
				if (app.Utils.get('needsCleanup')) {
					app.Utils.set('needsCleanup', false);
					return app.User.cleanup();
				} else {
					return Promise.resolve();
				}
			}

			return ifCleanup().then(() => {
				return app.User.signIn();
			}).then(() => {
				return app.Reg.register();
			}).then(() => {
				return app.Msg.sendDeviceAdded();
			});
		},

		/**
		 * Unregister {@link Device} and sign out
		 * @return {Promise.<void>}
		 * @memberOf User
		 */
		removeAccess: function() {
			return app.Msg.sendDeviceRemoved().then(() => {
				return app.Reg.unregister();
			}).then(() => {
				return app.User.signOut();
			}).then(() => {
				app.Devices.clear();
				return Promise.resolve();
			});
		},

		/**
		 * Get an OAuth2.0 token
		 * @see https://developer.chrome.com/apps/identity#method-getAuthToken
		 * @param {boolean} retry - if true, retry with new token on error
		 * @return {Promise<token>} An access token
		 * @memberOf User
		 */
		getAuthToken: function(retry) {
			// If signed in, first try to get token non-interactively.
			// If it fails, probably means token has expired or is invalid.
			const interactive = !app.Utils.isSignedIn();

			const chromep = new ChromePromise();
			return chromep.identity.getAuthToken({
				'interactive': interactive,
			}).then((token) => {
				if (chrome.runtime.lastError) {
					const error = chrome.runtime.lastError.message;
					if (retry && error && token) {
						// cached token may be expired or invalid.
						// remove it and try again
						return app.User.removeCachedAuthToken(token)
							.then(() => {
								return app.User.getAuthToken(false);
							});
					} else {
						throw new Error(error);
					}
				} else {
					return Promise.resolve(token);
				}
			});
		},

		/**
		 * Cleanup after user signs out of Browser
		 * @return {Promise.<void>}
		 * @memberOf User
		 */
		cleanup: function() {
			return app.User.getAuthToken(false).then((token) => {
				return app.User.removeCachedAuthToken(token);
			});
		},

		/**
		 * Remove Auth token from cache
		 * @param {string} token - Auth token
		 * @return {Promise<void>}
		 * @memberOf User
		 */
		removeCachedAuthToken: function(token) {
			const chromep = new ChromePromise();
			return chromep.identity.removeCachedAuthToken({'token': token});
		},

		/**
		 * Persist info on current Browser user (may be no-one)
		 * @return {Promise.<void>}
		 * @memberOf User
		 */
		setInfo: function() {
			const chromep = new ChromePromise();
			return chromep.identity.getProfileUserInfo().then((user) => {
				app.Utils.set('lastUid', app.Utils.get('uid'));
				app.Utils.set('lastEmail', app.Utils.get('email'));
				app.Utils.set('email', user.email);
				app.Utils.set('uid', user.id);
				return Promise.resolve();
			});
		},

	};

})();
