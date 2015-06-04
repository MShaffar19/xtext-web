/*******************************************************************************
 * Copyright (c) 2015 itemis AG (http://www.itemis.eu) and others.
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v10.html
 *******************************************************************************/

/*
 * Use `createEditor(options)` to create an Xtext editor. You can specify options either
 * through the function parameter or through `data-editor-x` attributes, where x is an
 * option name with camelCase converted to hyphen-separated.
 * The following options are available:
 *
 * autoCompleteComments = true {Boolean}
 *     Whether comments shall be auto-completed.
 * autoPairAngleBrackets = true {Boolean}
 *     Whether <angle brackets> shall be auto-completed.
 * autoPairBraces = true {Boolean}
 *     Whether {braces} shall be auto-completed.
 * autoPairParentheses = true {Boolean}
 *     Whether (parentheses) shall be auto-completed.
 * autoPairQuotations = true {Boolean}
 *     Whether "quotations" shall be auto-completed.
 * autoPairSquareBrackets = true {Boolean}
 *     Whether [square brackets] shall be auto-completed.
 * computeSize = true {Boolean}
 *     Whether to enable automatic computation of the widget height.
 * contents = "" {String}
 *     The editor contents.
 * contentType {String}
 *     The content type included in requests to the Xtext server.
 * dirtyElement {String | DOMElement}
 *     An element into which the dirty status class is written when the editor is marked dirty;
 *     it can be either a DOM element or an ID for a DOM element.
 * dirtyStatusClass = "dirty" {String}
 *     A CSS class name written into the dirtyElement when the editor is marked dirty.
 * document {Document}
 *     The document.
 * enableContentAssistService = true {Boolean}
 *     Whether content assist should be enabled.
 * enableSaveAction = false {Boolean}
 *     Whether the save action should be bound to the standard keystroke ctrl+s / cmd+s.
 * enableValidationService = true {Boolean}
 *     Whether validation should be enabled.
 * expandTab = false {Boolean}
 *     Whether the tab key inserts white spaces.
 * firstLineIndex = 1 {Number}
 *     The line index displayed for the first line of text.
 * fullSelection = true {Boolean}
 *     Whether or not the view is in full selection mode.
 * xtextLang {String}
 *     The language name (usually the file extension configured for the language).
 * loadFromServer = true {Boolean}
 *     Whether to load the editor content from the server. If enabled, the client will try to
 *     send only deltas instead of the full text whenever possible.
 * model {TextModel}
 *     The base text model.
 * parent {String | DOMElement}
 *     The parent element for the view; it can be either a DOM element or an ID or class name for a DOM element.
 * readonly = false {Boolean}
 *     Whether the view is read-only.
 * resourceId {String}
 *     The identifier of the resource displayed in the text editor; this option is sent to the server to
 *     communicate required information on the respective resource.
 * sendFullText = false {Boolean}
 *     Whether the full text shall be sent to the server with each request; use this if you want
 *     the server to run in stateless mode. If the option is inactive, the server state is updated regularly.
 * serverUrl {String}
 *     The URL of the Xtext server.
 * setFocus = false {Boolean}
 *     Whether to focus the editor after creation.
 * showAnnotationRuler = true {Boolean}
 *     Whether the annotation ruler is shown.
 * showErrorDialogs = false {Boolean}
 *     Whether errors should be displayed in popup dialogs.
 * showFoldingRuler = true {Boolean}
 *     Whether the folding ruler is shown.
 * showLinesRuler = true {Boolean}
 *     Whether the lines ruler is shown.
 * showOverviewRuler = true {Boolean}
 *     Whether the overview ruler is shown.
 * showZoomRuler = false {Boolean}
 *     Whether the zoom ruler is shown.
 * singleMode = false {Boolean}
 *     Whether the editor is in single line mode.
 * smartIndentation = true {Boolean}
 *     Whether to enable smart indentation.
 * statusElement {String | DOMElement}
 *     An element into which the status message is written if no status reporter is given;
 *     it can be either a DOM element or an ID for a DOM element.
 * statusReporter {Function}
 *     A status reporter function.
 * syntaxDefinition {String}
 *     A path to a JS file defining an Orion syntax definition (see orion/editor/stylers/lib/syntax.js);
 *     if no path is given, it is built from the 'xtextLang' option in the form 'xtext/<xtextLang>-syntax'.
 * tabMode = true {Boolean}
 *     Whether the tab key is consumed by the view or is used for focus traversal.
 * tabSize = 4 {Number}
 *     The number of spaces in a tab.
 * theme {String | TextTheme}
 *     The CSS file for the view theming or the actual theme.
 * themeClass {String}
 *     The CSS class for the view theming.
 * title = "" {String}
 *     The editor title.
 * wrappable = false {Boolean}
 *     Whether the view is wrappable.
 * wrapMode = false {Boolean}
 *     Whether the view wraps lines.
 */
define([
    "jquery",
    "orion/editor/edit",
    "orion/keyBinding",
    "orion/editor/textStyler",
	"xtext/OrionEditorContext",
	"xtext/services/LoadResourceService",
	"xtext/services/RevertResourceService",
	"xtext/services/SaveResourceService",
	"xtext/services/UpdateService",
	"xtext/services/ContentAssistService",
	"xtext/services/ValidationService"
], function(jQuery, orionEdit, mKeyBinding, mTextStyler, EditorContext, LoadResourceService, RevertResourceService,
		SaveResourceService, UpdateService, ContentAssistService, ValidationService) {
	
	/**
	 * Translate an HTML attribute name to a JS option name.
	 */
	function _optionName(name) {
		var prefix = "data-editor-";
		if (name.substring(0, prefix.length) === prefix) {
			var key = name.substring(prefix.length);
			key = key.replace(/-([a-z])/ig, function(all, character) {
				return character.toUpperCase();
			});
			return key;
		}
		return undefined;
	}
	
	/**
	 * Create a copy of the given object.
	 */
	function _copy(obj) {
		var copy = {};
		for (var p in obj) {
			if (obj.hasOwnProperty(p))
				copy[p] = obj[p];
		}
		return copy;
	}
	
	/**
	 * Merge all properties of the given parent element with the given default options.
	 */
	function _mergeOptions(parent, defaultOptions) {
		var options = _copy(defaultOptions);
		for (var attr, j = 0, attrs = parent.attributes, l = attrs.length; j < l; j++) {
			attr = attrs.item(j);
			var key = _optionName(attr.nodeName);
			if (key) {
				var value = attr.nodeValue;
				if (value === "true" || value === "false")
					value = value === "true";
				options[key] = value;
			}
		}
		return options;
	}
	
	/**
	 * Set the default options for Xtext editors.
	 */
	function _setDefaultOptions(options) {
		if (!options.xtextLang && options.lang)
			options.xtextLang = options.lang
		if (!options.xtextLang && options.resourceId)
			options.xtextLang = options.resourceId.split('.').pop();
		if (!options.statusReporter && options.statusElement) {
			var statusElement = options.statusElement;
			if (typeof(statusElement) === "string") {
				var doc = options.document || document;
				statusElement = doc.getElementById(statusElement);
			}
			if (statusElement !== undefined) {
				options.statusReporter = function(message, isError) {
					statusElement.textContent = message;
				};
			}
		}
		options.noFocus = !options.setFocus;
		options.noComputeSize = options.computeSize !== undefined && !options.computeSize;
		if (options.autoCompleteComments === undefined)
			options.autoCompleteComments = true;
		if (options.autoPairAngleBrackets === undefined)
			options.autoPairAngleBrackets = true;
		if (options.autoPairBraces === undefined)
			options.autoPairBraces = true;
		if (options.autoPairParentheses === undefined)
			options.autoPairParentheses = true;
		if (options.autoPairQuotations === undefined)
			options.autoPairQuotations = true;
		if (options.autoPairSquareBrackets === undefined)
			options.autoPairSquareBrackets = true;
		if (options.smartIndentation === undefined)
			options.smartIndentation = true;
	}
	
	var exports = {};
	
	/**
	 * Create an Xtext editor instance configured with the given options.
	 * 
	 * Hint: Orion does not allow to configure the syntax file path (https://bugs.eclipse.org/bugs/show_bug.cgi?id=469249),
	 *       so the options 'lang' and 'contentType' should be avoided with the current version. Use 'xtextLang' instead.
	 */
	exports.createEditor = function(options) {
		if (!options)
			options = {};
		if (!options.parent)
			options.parent = "xtext-editor";
		if (!options.className)
			options.className = "xtext-editor";
		
		var parents;
		if (typeof(options.parent) === "string") {
			var doc = options.document || document;
			var element = doc.getElementById(options.parent);
			if (element)
				parents = [element];
			else
				parents = doc.getElementsByClassName(options.parent);
		} else {
			parents = [options.parent];
		}
		
		if (parents.length == 1) {
			var editorOptions = _mergeOptions(parents[0], options);
			_setDefaultOptions(editorOptions);
			
			var editor = orionEdit(editorOptions);
			
			if (jQuery.isArray(editor))
				editor = editor[0];
			exports.configureServices(editor, editorOptions);
			return editor;
		} else {
			_setDefaultOptions(options);
			
			var editors = orionEdit(options);
			
			if (!jQuery.isArray(editors))
				editors = [editors];
			for (var i = 0; i < editors.length; i++) {
				var editorOptions = _mergeOptions(parents[i], options);
				exports.configureServices(editors[i], editorOptions);
			}
			return editors;
		}
	}
	
	/**
	 * Configure Xtext services for the given editor.
	 */
	exports.configureServices = function(editor, options) {
		if (!options.xtextLang && options.lang)
			options.xtextLang = options.lang
		if (!options.xtextLang && options.resourceId)
			options.xtextLang = options.resourceId.split('.').pop();
		var doc = options.document || document;
		if (options.dirtyElement) {
			var dirtyElement;
			if (typeof(options.dirtyElement) === "string")
				dirtyElement = jQuery("#" + options.dirtyElement, doc);
			else
				dirtyElement = jQuery(options.dirtyElement);
			var dirtyStatusClass = options.dirtyStatusClass;
			if (!dirtyStatusClass)
				dirtyStatusClass = "dirty";
			editor.addEventListener("DirtyChanged", function(event) {
				if (editor.isDirty())
					dirtyElement.addClass(dirtyStatusClass);
				else
					dirtyElement.removeClass(dirtyStatusClass);
			});
		}
		
		var textView = editor.getTextView();
		var editorContext = new EditorContext(editor);
		var editorContextProvider = {
			getEditorContext : function() {
				return editorContext;
			},
			getOptions : function() {
				return options;
			}
		};
		editor.getEditorContext = editorContextProvider.getEditorContext;
		
		//---- Persistence Services
		
		var serverUrl = options.serverUrl;
		if (!serverUrl)
			serverUrl = "http://" + location.host + "/xtext-service";
		var resourceId = options.resourceId;
		var loadResourceService = undefined, saveResourceService = undefined, revertResourceService = undefined;
		if (resourceId) {
			if (options.loadFromServer === undefined || options.loadFromServer) {
				options.loadFromServer = true;
				loadResourceService = new LoadResourceService(serverUrl, resourceId);
				loadResourceService.loadResource(editorContext, _copy(options));
				saveResourceService = new SaveResourceService(serverUrl, resourceId);
				if (options.enableSaveAction) {
					textView.setKeyBinding(new mKeyBinding.KeyStroke("s", true), "saveXtextDocument");
					textView.setAction("saveXtextDocument", function() {
						saveResourceService.saveResource(editorContext, _copy(options));
						return true;
					}, {name: "Save"});
				}
				revertResourceService = new RevertResourceService(serverUrl, resourceId);
			}
		} else {
			if (options.loadFromServer === undefined)
				options.loadFromServer = false;
			if (options.xtextLang)
				resourceId = "text." + options.xtextLang;
		}
		
		//---- Syntax Highlighting Service
		
		if (options.xtextLang) {
			var contentType = "xtext/" + options.xtextLang;
			var syntaxDefinition = options.syntaxDefinition;
			if (!syntaxDefinition) {
				syntaxDefinition = contentType + "-syntax";
			}
			require([syntaxDefinition], function(grammar) {
				var annotationModel = editor.getAnnotationModel();
				var stylerAdapter = new mTextStyler.createPatternBasedAdapter(grammar.grammars, grammar.id, contentType);
				new mTextStyler.TextStyler(textView, annotationModel, stylerAdapter);
			});
		}
		
		//---- Validation Service
		
		var validationService;
		if (options.enableValidationService || options.enableValidationService === undefined) {
			validationService = new ValidationService(serverUrl, resourceId);
		}
		
		//---- Update Service
		
		function refreshDocument() {
			editorContext.clearClientServiceState();
			if (validationService)
				validationService.computeProblems(editorContext, _copy(options));
		}
		var updateService = undefined;
		if (!options.sendFullText) {
			updateService = new UpdateService(serverUrl, resourceId);
			if (saveResourceService)
				saveResourceService.setUpdateService(updateService);
			editorContext.addServerStateListener(refreshDocument);
		}
		function modelChangeListener(event) {
			if (editor._modelChangeTimeout) {
				clearTimeout(editor._modelChangeTimeout);
			}
			editor._modelChangeTimeout = setTimeout(function() {
				if (options.sendFullText)
					refreshDocument();
				else
					updateService.update(editorContext, _copy(options));
			}, 500);
		};
		if (!options.resourceId || !options.loadFromServer) {
			modelChangeListener(null);
		}
		textView.addEventListener("ModelChanged", modelChangeListener);
		
		//---- Content Assist Service
		
		var contentAssist = editor.getContentAssist();
		if (contentAssist && (options.enableContentAssistService || options.enableContentAssistService === undefined)) {
			contentAssist.setEditorContextProvider(editorContextProvider);
			var contentAssistService = new ContentAssistService(serverUrl, resourceId);
			if (updateService)
				contentAssistService.setUpdateService(updateService);
			contentAssist.setProviders([{
				id : "xtext.service",
				provider : contentAssistService
			}]);
		}
		
		editor.invokeXtextService = function(service, invokeOptions) {
			var optionsCopy = _copy(options);
			for (var p in invokeOptions) {
				if (invokeOptions.hasOwnProperty(p)) {
					optionsCopy[p] = invokeOptions[p];
				}
			}
			if (service === "load" && loadResourceService)
				loadResourceService.loadResource(editorContext, optionsCopy);
			else if (service === "save" && saveResourceService)
				saveResourceService.saveResource(editorContext, optionsCopy);
			else if (service === "revert" && revertResourceService)
				revertResourceService.revertResource(editorContext, optionsCopy);
			else if (service === "validation" && validationService)
				validationService.computeProblems(editorContext, optionsCopy);
			else
				throw "Service '" + service + "' is not available.";
		};
		editor.xtextServiceSuccessListeners = [];
		editor.xtextServiceErrorListeners = [function(requestType, xhr, textStatus, errorThrown) {
			if (options.showErrorDialogs)
				window.alert("Xtext service '" + requestType + "' failed: " + errorThrown);
			else
				console.log("Xtext service '" + requestType + "' failed: " + errorThrown);
		}];
	}
	
	/**
	 * Invoke an Xtext service.
	 * 
	 * @param editor
	 *     The editor for which the service shall be invoked.
	 * @param service
	 *     A service type identifier, e.g. "save".
	 * @param invokeOptions
	 *     Additional options to pass to the service (optional).
	 */
	exports.invokeService = function(editor, service, invokeOptions) {
		if (editor.invokeXtextService)
			editor.invokeXtextService(service, invokeOptions);
		else
			throw "The editor has not been configured with Xtext.";
	}
	
	return exports;
});

