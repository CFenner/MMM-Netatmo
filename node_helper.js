/* Magic Mirror
 * Module: MagicMirror-Netatmo-Module
 *
 * By Christopher Fenner https://github.com/CFenner
 * MIT Licensed.
 */
const NodeHelper = require('node_helper')
const api = require('./api')

module.exports = NodeHelper.create(api)
