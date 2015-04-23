/**
 * Include shim for ECMAScript v5 for old browser (IE8 and less).
 */
(function(){
  if (typeof Array.isArray === "undefined") {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", "/mobile/mobile/js/es5-shim.js", false);
    xhr.send(null);
    if (xhr.status !== 200 && xhr.status !== 304) {
      throw new Error("Failed to load es5-shim.js");
    }
    eval(xhr.responseText);
  }
})();


if (window.xdo == null)
{
  /**
   * xdo root object. Do not instantiate this.
   *
   * @class base object for xdo framework 
   */
   xdo = {};
}

/**
 * set debug mode to disable // xdo.require().
 * @private 
 */
xdo._debug = true

/**
 * array to cache loaded class information
 * @type {Object}
 * @private
 */
xdo._loadedClass = {};


/**
 * array to cache previous error class so that
 * avoid multiple error
 * @type {Object}
 * @private
 */
xdo._errorClass = {};


/**
 * xdo library startup status
 * @type {Boolean}
 * @private
 */
xdo._loaded = false;


/**
 * declare the usage of specified class. 
 * This function setup environment by resolving unloaded libraries
 *
 * @param {String} className class name to be setup
 */
xdo.require = function(className)
{
  if (xdo._debug)
  {
    xdo._loadedClass[className] = true;
    return;
  } 
  
  // check previously loaded
  if (xdo.exists(className))
  {
    return;
  }

  xdo._loadedClass[className] = true;
  if (xdo._errorClass[className] == null)
  {
    try
    {
      xdo.pLoader.load(className);
    }
    catch (e)
    {
      // TODO: call log class
      window.alert(xdo.getMessage('Error.Failed to load script', [className,e.message]));
      xdo._errorClass[className] = true;
      delete xdo._loadedClass[className];
    }
  }
  
}
/**
 * returns specified class is already defined in the system or not.
 * @param {String} className class name
 * @return {Boolean}
 */
xdo.exists = function(className)
{
  if (xdo._loadedClass[className])
  {
    return true;
  }
  
  var pkgArray = className.split(".");
  var len = pkgArray.length;
  var obj = xdo;
  for (var i=1; i<len; i++)
  {
    if (obj[pkgArray[i]] == null)
    {
      return false;
    }
    else
    {
      obj = obj[pkgArray[i]];
    }
  }
  
  return true;
}

/**
 * returns stack trace array
 * @param {Event}
 * @return {Array}
 */
xdo.getStackTrace = function(e)
{
  var KEYWORD_FUNC  = 'function';
  var KEYWORD_ANON = "{anonymous}";

  var fnRegExp = /function\s*([\w\-$]+)?\s*\(/i;
  var stack = [];
  var j=0;
  
  var curr  = arguments.callee.caller;
  while (curr)
  {
    var fn    = fnRegExp.test(curr.toString()) ? RegExp.$1 || KEYWORD_ANON : KEYWORD_ANON;
    var args  = stack.slice.call(curr.arguments);
    var i     = args.length;

    while (i--)
    {
      switch (typeof args[i])
      {
        case 'string'  : args[i] = '"'+args[i].replace(/"/g,'\\"')+'"'; break;
        case 'function': args[i] = KEYWORD_FUNC; break;
        default: args[i] = args[i].toString(); break;
      }
    }
    stack[j++] = fn + '(' + args.join() + ')';
    curr = curr.caller;
  }

  return stack;
}

/**
 * bind the package and class definition
 *
 * @param {String} pkgstr global package name
 * @param {Class}  classDef class definition
 */
xdo.bind = function(pkgstr, classDef)
{
  // parser package definition
  var pkgArray = pkgstr.split(".");
  var obj = window[pkgArray[0]];
  var len = pkgArray.length - 1;
  for (var i=1; i<len; i++)
  {
    if (obj[pkgArray[i]] == null)
     {
       obj[pkgArray[i]] = {};
     }
     obj = obj[pkgArray[i]];
  }
  
  obj[pkgArray[len]] = classDef;
}

/**
 * static field to keep default javascript library location
 * @type String
 */
xdo.mScriptRoot = "mobile/js";


/*
 * Small Routine to adjust script path
 */
(function() {
  /* adjust loading point */
  var scripts = document.getElementsByTagName('SCRIPT');
  for (var i=0; i<scripts.length; i++)
  {
    var xdosrc = scripts[i].getAttribute('src');
    if (xdosrc == null) continue;
    if (xdosrc.match(/(xdoloader\.jsp|xdo\.js|xdo_rel\.js|xdo_rel_c\.js).*$/))
    {
      // adjust script root
      var scriptRoot = xdosrc.replace(/(xdoloader\.jsp|xdo\.js|xdo_rel\.js|xdo_rel_c\.js).*/, "");
      if (scriptRoot.match(/\/$/))
      {
        scriptRoot = scriptRoot.substring(0, scriptRoot.length-1);
      }
      xdo.mScriptRoot = scriptRoot;

      // Parse the parameters from the URL
      var params = xdosrc.split('?');
      // Exit if there's no param part.
      if (params.length == 1) break;      
      
      // Get the parameter part 
      params = params[1].split('&');
      // Parse each parameter
      for (var j = 0; j < params.length; j++)
      {
        // Get the parameter name and value
        var param = params[j].split('=');
        // Continue if there's no name value pair.
        if (param.length == 1) continue;      
        switch (param[0])
        {
          case "cacheBuster" :
          xdo._version = param[1];
          break;
          
          case "_locale" :
          xdo._locale = param[1];
          break;
          
          case "_messageClass" :
          xdo._messageClass = param[1];
          break;
          
          default:
          break;
        }
      }
      break;
    }
  }
})();

/**
 * Class loader. Methods can be called through xdo.bind().
 * So there is no need to access this directly.
 *
 * @private
 * @type Object
 */
xdo.pLoader = {

  _ajax: null,
  
  /**
   * static method to load javascript file and eval
   * @argument {String} js javascript class name
   * @throws
   * @private 
   */  
  load: function(js)
  {
    // replace
    js = js.replace(/\./g, "/");
    if (xdo.mScriptRoot != null)
    {
      if (xdo.mScriptRoot.charAt(xdo.mScriptRoot.length-1) != "/")
      {
        js = "/"+js;
      }

      if (xdo._version)
			{
        js = xdo.mScriptRoot + js + ".js?cacheBuster=" + xdo._version;
			} 
			else
			{
        js = xdo.mScriptRoot + js + ".js";
			}   
    }
    
//    var ajax = xdo.pLoader._ajax;
    var ajax = null;
    // branch for native XMLHttpRequest object
    if (ajax == null)
    {
      if (window.XMLHttpRequest)
      {
        ajax = new XMLHttpRequest();
      }
      // branch for IE/Windows ActiveX version
      else if (window.ActiveXObject)
      {
        var progIDs = ['MSXML2.XMLHTTP.6.0', 'MSXML2.XMLHTTP.3.0'];
        for (var i = 0; i < progIDs.length; i++)
        {
          try
          {
             ajax = new ActiveXObject(progIDs[i]);
             break;
          }
          catch (ex)
          {
          }
        }        
      }
	  
      xdo.pLoader._ajax = ajax;
    }

    try
    {
      ajax.open("GET", js, false);
      ajax.send(null);
	  
      if (ajax.status != 200 && ajax.status != 304)
      {
        throw new Error("Failed to load: "+js);
      }
    }
    catch (e)
    {
      throw e;
    }

    try
    {
      var script =  ajax.responseText + '\n//# sourceURL='+js.split('?')[0]+'\n';
      eval(script);  
    }
    catch(e)
    {
      //throw new Error("Failed to eval: "+js);
      throw e;
    }
  }
};


/**
 * extends class functionality.
 * 
 * @param {Object} subclass object to inherit 
 * @param {Object} superclass object to be inherited
 */
xdo.extend = function (subclass, superclass)
{
  var f = function f(){};
  f.prototype = superclass.prototype;
  subclass.prototype = new f();
  subclass.prototype.constructor = subclass;
  subclass.superclass = superclass.prototype;
}

// xdo.require("xdo.i18n.MessageUtils");

/*
 * ======================================================================
 * set translation utility
 * ======================================================================
 */
if (xdo.messages == null) xdo.messages = {};

/**
 * Just a shorthand for xdo.i18n.Messages
 * @param {String} key key string for the translated string
 * @param {Array} arguments parameter arguments array for the formatted string
 * @return {String} translated message
 */
xdo.getMessage = function (key, args)
{
  return xdo.i18n.MessageUtils.getText(key, args);
}


//// xdo.require("xdo.resource.Image");
// xdo.require("xdo.app.System");

xdo.getImage = function (key)
{
  var theme = xdo.app.System.getProperty("xdo.theme");
  return "theme/" + theme + "/mobile/images" + "/" + key + ".png";  
  //return xdo.resource.Image.getImage(key);
}



/*
 * ======================================================================
 * set window.onload/onunload handler for the framework
 * ======================================================================
 */ 
xdo._func = new Array();

/**
 * cleanup routine
 * @private
 */
xdo.cleanup = function()
{
  // clear registerd drag and drop objects
  if (xdo.dnd != null && xdo.dnd.DnDManager != null)
  {
    xdo.dnd.DnDManager.cleanup();
  }
  
  // clear registerd events
  xdo.event.JSEvent.clearAllEvent();  
}

/**
 * startup routine
 * @private
 */
xdo.startup = function()
{
  // create
  var xdoElem = document.createElement('DIV');
  xdoElem.id = xdo._frameworkElemId;
  xdo.dom.DOMElement.append(document.body, xdoElem);
  
  // run
  for (var i=0; i<xdo._func.length; i++)
  {
    xdo._func[i]();
  }
  
  xdo._loaded = true;
}


/**
 * Runs specified function. This function call is assured to be called after
 * page loading. If this method is called before page loading,
 * assigned function call will be differed after page is loaded completely.
 * Otherwise calls immediately.
 *
 * @param {Function} func code to run    
 */
xdo.run = function(func)
{
  if (!xdo._loaded)
  {
    xdo._func.push(func);
  }
  else
  {
    func();
  }
}

// xdo.require("xdo.event.JSEvent");

// xdo.event.JSEvent.attachEvent(window, "onunload", xdo.cleanup);
// xdo.event.JSEvent.attachEvent(window, "onload", xdo.startup);

/*
 * ======================================================================
 * html element 
 * ======================================================================
 */

/**
 * id string for the xdo framework element id
 * @private
 */
xdo._frameworkElemId = 'xdofrmwk'


/**
 * Returns reserved html element for the framework. 
 * This is for preventing all screen refresh on appending element to the document.body.
 * id=xdo div element is created at the framework startup
 *    
 * @return {Element} element for the system
 */
xdo.getElement = function()
{
  return document.getElementById(xdo._frameworkElemId);
}


/* 
 * ======================================================================
 * Load base functions
 * ====================================================================== 
 */
// xdo.require("xdo.Browser");
// xdo.require("xdo.dom.DOMElement");
// xdo.require("xdo.lang.Rectangle");
// xdo.require("xdo.lang.Dimension");

// This way somehow doesn't work with the aggregated version of js (xdo_rel.js).
// Getting back to the original translation loading logic for now. 
//// xdo.require(xdo._messageClass);
//// xdo.require("xdo.log.LogWindow");

function dum(){}

(function(){
xdo.bind("xdo.i18n.MessageUtils", MessageUtils);

/**
 * @class Utilities for handling messages.
 */
function MessageUtils()
{
}
/**
 * 
 * @param {String} key message key
 * @param {Array} arguments values for placeholders in the message
 * @return {String} message
 */
MessageUtils.getText = function(key, args)
{
  var text = xdo.messages[key];
  if (text && args)
  {
    for (var i = 0; i < args.length; i++)
    {
      var token = '{' + i + '}';
      text = text.replace(token, args[i]);
    }
  }
  return text?text:"undefined:key="+key;
}
})();


(function(){
xdo.bind("xdo.Browser", Browser);

/**
 * Browser class. All of functions are provided as static methods.
 * Do not instantiate this class.
 * @class Class to provide browser judge related functions 
 */
function Browser() {}

/**
 * Browser ID for Unknown browser
 * @type Number
 * @constant
 */
Browser.UNKNOWN = -1;

/**
 * Browser ID for IE series
 *
 * @type Number
 * @constant
 */
Browser.IE = 1;

/**
 * Browser ID for Mozilla series (including Firefox, Netscape)
 *
 * @type Number
 * @constant
 */
Browser.MOZILLA = 2;

/**
 * Browser ID for Opera series
 *
 * @type Number
 * @constant
 */
Browser.OPERA = 3;

/**
 * Browser ID for Safari series
 *
 * @type Number
 * @constant
 */
Browser.SAFARI = 4;

/**
 * Browser ID for Chrome series
 *
 * @type Number
 * @constant
 */
Browser.CHROME = 5;

/**
 * Browser ID for IE 7
 * @type Number
 * @constant
 */
Browser.IE7 = 7;

/**
 * Browser ID for IE 8
 * @type Number
 * @constant
 */
Browser.IE8 = 8;

/**
 * Browser ID for IE 6
 * @type Number
 * @constant
 */
Browser.IE6 = 6;

/**
 * Browser ID for IE 9
 * @type Number
 * @constant
 */
Browser.IE9 = 9;

/**
 * Browser ID for IE 10
 * @type Number
 * @constant
 */
Browser.IE10 = 10;

/**
 * Browser ID for IE 11
 * @type Number
 * @constant
 */
Browser.IE11 = 11;


/**
 * Current Browser's Browser ID
 *
 * @type Number
 */
Browser.mBrowser = Browser.UNKNOWN;
Browser.mIsMobile = false;


/**
 * Browser Detection code
 * @param {String} info UserAgent string
 * @private
 */
Browser._init = function (userAgent){
  // FIXME: it is not enough
  // Order matters
  if (/Chrome/.test(userAgent))
  {
    Browser.mBrowser = Browser.CHROME;
  }
  else if (/WebKit/.test(userAgent))
  {
    Browser.mBrowser = Browser.SAFARI;
  }  
  else if (window.opera != null)
  {
    Browser.mBrowser = Browser.OPERA;
  }
  else if (/MSIE 6\.0/.test(userAgent))
  {
    Browser.mBrowser = Browser.IE6;
  }  
  else if (/MSIE 7\.0/.test(userAgent))
  {
    Browser.mBrowser = Browser.IE7;
  }
  else if (/MSIE 8\.0/.test(userAgent))
  {
    Browser.mBrowser = Browser.IE8;
  }
  else if (/MSIE 9\.0/.test(userAgent))
  {
    Browser.mBrowser = Browser.IE9;
  }
  else if (/MSIE 10\.0/.test(userAgent))
  {
    Browser.mBrowser = Browser.IE10;
  }
  else if (/Trident/.test(userAgent) && /rv\:11\.0/.test(userAgent))
  {
    // User agent string has changed significantly in IE11.
    // http://msdn.microsoft.com/library/ms537503.aspx
    Browser.mBrowser = Browser.IE11;
  }  
  else if (/MSIE/.test(userAgent))
  {
    Browser.mBrowser = Browser.IE;
  }
  else if (/Gecko/.test(userAgent))
  {
    // Starting from IE11, IE's user agent string contains "like Gecko", thus IE11 browser sniffing has to be done before Mozilla.
    Browser.mBrowser = Browser.MOZILLA;
  }
  else
  {
    Browser.mBrowser = Browser.UNKNOWN;
  }
  
  Browser.mIsMobile = /(iPad)|(iPhone)|(iPod)|(android)|(webOS)/i.test(userAgent);
}

// call init code
Browser._init(navigator.userAgent);

/**
 * check the current browser is IE series
 * @return {Boolean} true if the browser is IE6, IE7, IE8, IE9, IE10
 */
Browser.isIE = function()
{
  // Returns false for IE11, because it will cause lots of regression.
  // For example, the following code will fail because IE11 no longer supports attachEvent.
  // if (xdo.Browser.isIE()) { elem.attachEvent("onclick", func);}
  return Browser.mBrowser == Browser.IE10 ||
         Browser.mBrowser == Browser.IE9 ||
         Browser.mBrowser == Browser.IE8 ||
         Browser.mBrowser == Browser.IE7 ||
         Browser.mBrowser == Browser.IE6 ||
         Browser.mBrowser == Browser.IE;
}

Browser.getIEVersion = function()
{
  if (!Browser.isIE()) return null;

  var matchResult = navigator.userAgent.match(/MSIE ([0-9.]+)/);
  if (matchResult && matchResult.length > 1)
  {
    return parseFloat(matchResult[1]);
  }

  return 0;
}

Browser.getIEDocumentMode = function()
{
  if (!Browser.isIE()) return null;
  
  return document.documentMode;
}

/**
 * check the current browser is IE6
 * @return {Boolean} true if the browser is IE6
 */
Browser.isIE6 = function()
{
  return (Browser.mBrowser == Browser.IE6);
}


/**
 * check the current browser is IE7
 * @return {Boolean} true if the browser is IE7
 */
Browser.isIE7 = function()
{
  return (Browser.mBrowser == Browser.IE7);
}


/**
 * check the current browser is IE8
 * @return {Boolean} true if the browser is IE8
 */
Browser.isIE8 = function()
{
  return (Browser.mBrowser == Browser.IE8);
}

/**
 * check the current browser is IE9
 * @return {Boolean} true if the browser is IE9
 */
Browser.isIE9 = function()
{
  return (Browser.mBrowser == Browser.IE9);
}

/**
 * check the current browser is IE10
 * @return {Boolean} true if the browser is IE10
 */
Browser.isIE10 = function()
{
  return (Browser.mBrowser == Browser.IE10);
}

/**
 * check the current browser is IE11
 * @return {Boolean} true if the browser is IE11
 */
Browser.isIE11 = function()
{
  return (Browser.mBrowser == Browser.IE11);
}


/**
 * check the current browser is Mozilla browser
 * @return {Boolean} true if the browser is Mozilla (Firefox, Seamonkey)
 */
Browser.isMozilla = function()
{
  return (Browser.mBrowser == Browser.MOZILLA)
}

/**
 * check the current browser is WebKit
 * @return {Boolean} true if the browser is WebKit (Safari, Chrome)
 */
Browser.isWebKit = function()
{
  return (Browser.mBrowser == Browser.SAFARI || Browser.mBrowser == Browser.CHROME);
}

/**
 * check the current browser is on mobile device or not.
 * @return {Boolean} true if the browser is on the mobile device 
 * which is either iPad, iPhone, iPod, android or webOS.
 */
Browser.isMobile = function()
{
  return Browser.mIsMobile;
}


Browser._scrollBarSize = null;

Browser.getScrollBarSize = function()
{
  if (Browser._scrollBarSize === null)
  {
    // create dummy element
    var frmwkElem = xdo.getElement();
    if (frmwkElem === null) return 17;  // it returns default value
    
    var checkDiv = '<div id="forScrollBarSize" style="position: relative; z-index: -1000; width: 100px; height: 100px; overflow: scroll;"></div>';
    xdo.dom.DOMElement.append(frmwkElem, checkDiv);
    
    var checkDivElem = document.getElementById("forScrollBarSize");
    Browser._scrollBarSize = checkDivElem.offsetWidth - checkDivElem.scrollWidth;
    
    frmwkElem.removeChild(checkDivElem);
  }
  
  return Browser._scrollBarSize;
}

// call it immediately after DOM is ready
xdo.run(Browser.getScrollBarSize);

})();


(function(){
xdo.bind("xdo.lang.Dimension", Dimension);

/**
 * Constructor of Dimension object
 *
 * @class The Dimension class encapsulates the width and height in a single object.
 *
 * @param {Number} width width value (option)
 * @param {Number} height height value (option)
 */
function Dimension(width, height)
{
  width = (width == null)? 0 : width;
  height = (height == null)? 0 : height;
  
  /**
   * width value (default is 0)
   *
   * @type Number
   */
  this.width = width;
  
  /**
   * height value (default is 0)
   *
   * @type Number
   */  
  this.height = height;
}



})();


(function(){
xdo.bind("xdo.lang.Rectangle", Rectangle);

/**
 * Constructor of Rectangle object
 *
 * @class The Rectangle class encapsulates the x, y position of the rectangle
 * and width, height in a single object.
 *
 * @param {Number} x x value (option)
 * @param {Number} x y value (option) 
 * @param {Number} width width value (option)
 * @param {Number} height height value (option)
 */
function Rectangle(x, y, width, height)
{
  x = (x == null)? 0 : x;
  y = (y == null)? 0 : y;
  width = (width == null)? 0 : width;
  height = (height == null)? 0 : height;
  
  /**
   * x value (default is 0)
   * @type Number
   */
  this.x = x;
  
  /**
   * y value (default is 0)
   * @type Number
   */
  this.y = y;
  
  /**
   * width value (default is 0)
   *
   * @type Number
   */
  this.width = width;
  
  /**
   * height value (default is 0)
   *
   * @type Number
   */  
  this.height = height;
}

/**
 * clip this rectangle with specified rectangle.
 * @param {xdo.lang.Rectangle} rect clip rectangle size
 */
Rectangle.prototype.clip = function (rect)
{
  if (rect == null) return;
  
  // clip rectangle with the specified rectangle
  var sx = this.x;
  var sy = this.y;
  var ex = this.x + this.width;
  var ey = this.y + this.height;
  
  var rectSX = rect.x;
  var rectSY = rect.y;
  var rectEX = rect.x + rect.width;
  var rectEY = rect.y + rect.height;
  
  this.x = Math.max(sx, rectSX);
  this.y = Math.max(sy, rectSY);
  this.width  = Math.min(ex, rectEX) - this.x;
  this.height = Math.min(ey, rectEY) - this.y;

  // check invalid rectangle
  if (this.width < 0 || this.height < 0) 
  {
    this.x = sx;
    this.y = sy;
    this.width = ex-sx;
    this.height = ey-sy;
  }
}

/**
 * checks specified point is inside of this dimension
 *
 * @param {Point} pt x,y position
 * @return {Boolean} true if the point is in this area, false if not.
 */
Rectangle.prototype.isInside = function (pt)
{
  if (pt == null) return false;
  
  if (this.x <= pt.x && pt.x <= this.x + this.width)
  {
    if (this.y <= pt.y && pt.y <= this.y + this.height)
    {
      return true;
    }
  }
  
  return false;
}

})();


(function(){
xdo.bind("xdo.lang.Point", Point);

/**
 * Constructor of Point object
 *
 * @class The Point class encapsulates the x and y in a single object.
 *
 * @param {Number} x x value (option)
 * @param {Number} y y value (option)
 */
function Point(x, y)
{
  x = (x == null)? 0 : x;
  y = (y == null)? 0 : y;
  
  /**
   * x value (default is 0)
   *
   * @type Number
   */
  this.x = x;
  
  /**
   * y value (default is 0)
   *
   * @type Number
   */  
  this.y = y;
}


})();


(function(){
xdo.bind("xdo.event.EventList", EventList);

/**
 * EventList constructor.
 * @constructor
 */
function EventList()
{
  /**
   * event list hash
   * @private
   */
  this.pList = {};
}
/**
 * Returns the event list.
 * @return {Object} list of events
 */
EventList.prototype.getList = function()
{
  return this.pList;
}
/**
 * Adds an event.
 * @param {Object} eventInfo
 */
EventList.prototype.add = function (eventInfo)
{
  var elem = eventInfo.elem;
  var key = (elem.id != null)? elem.id : elem;
  
  var events = this.pList[key];
  if (events == null)
  {
    this.pList[key] = {};
    events = this.pList[key];
  }
  
  var evname = eventInfo.eventName;
  var ename = events[evname];
  if (ename == null)
  {
    events[evname] = new Array;
    ename = events[evname];
  }
  
  ename.push(eventInfo);
}
/**
 * Returns the event list.
 * 
 * @param {Element} elem target element
 * @return {Object} event list
 */
EventList.prototype.getEventList = function (elem)
{
  var key = elem.id;
  if (key == "") return null;
  
  return this.pList[key];
}

/**
 * check the same event is already registerd. 
 *  
 * @param {Object} eventInfo event information object
 * @return {Object} event object which already in the list,
 *                  null if there is no entry found 
 */
EventList.prototype.hasEntry = function (eventInfo)
{
  var events = this.getEventList(eventInfo.elem);
  if (events == null) return null;
  
  var evname = eventInfo.eventName;
  var enameArray = events[evname];
  if (enameArray == null) return null;
  
  var len = enameArray.length;
  for (var i=0; i<len; i++)
  {
    var q = enameArray[i];
    
    if (q.handler == eventInfo.handler &&
          q.useCapture == eventInfo.useCapture)
    {
      return q;
    }
  }
  
  return null;
}
/**
 * 
 * @param {Object} eventInfo
 * @return 
 */
EventList.prototype.remove = function (eventInfo)
{
  var elem = eventInfo.elem;
  var key = (elem.id != null)? elem.id : elem;
  
  var events = this.pList[key];
  var evname = eventInfo.eventName;
  
  if (evname == null)
  {
    // delete all handlers attached to this elem
    delete this.pList[key];
    return;
  }

  // already deleted
  if (events == null) return;
  
  var enameArray = events[evname];
  if (enameArray == null) return;
  
  var len = enameArray.length;
  for (var i=0; i<len; i++)
  {
    q = enameArray[i];
    if (this.pIsContain(q, eventInfo))
    {
      enameArray.splice(i, 1);
      if (enameArray.length == 0)
      {
        // remove entry
        delete events[evname];
      }
      
      return true;
    }
  }
  
  return false;
}
/**
 * @private
 * @param {Object} infoInTheList
 * @param {Object} info
 */
EventList.prototype.pIsContain = function (infoInTheList, info)
{
  if (info.handler == null)
  {
    return true;
  }
  
  info.useCapture = (info.useCapture == null)? false : info.useCapture;
  if (infoInTheList.handler.toString() == info.handler.toString()
       && infoInTheList.useCapture == info.useCapture)
  {
    return true;
  }
  
  return false;
}
})();


(function(){
xdo.bind("xdo.dom.DOMElement", DOMElement);
xdo.require("xdo.lang.Rectangle");
xdo.require("xdo.lang.Dimension");
xdo.require("xdo.event.JSEvent");
xdo.require("xdo.Browser");

/**
 * Provides static methods to get or set values of 
 * DOM Element/Node object. This class provides the consistent
 * way to set/get DOM data across the browsers.
 * 
 * @class Provides static methods to get or set values of 
 * DOM Element/Node object.
 */
function DOMElement()
{
}

/**
 * returns rectangle information from the parent element which has 'relative' 
 * in the position css.
 * 
 * @param {Element} element element to check
 * @return {xdo.lang.Rectangle} x,y from relative parent element, 
 * and specified element's width and height
 */
DOMElement.getRelativePosition = function(element)
{
  element = DOMElement.getElement(element);
  if (element == null) return null;
  
  var x = element.offsetLeft;
  var y = element.offsetTop;

  var parent = element.offsetParent;
  while ( parent != null && parent.style.position != 'relative' )
  {
    x += parent.offsetLeft;
    y += parent.offsetTop;
    parent = parent.offsetParent;
  }

  var w = element.offsetWidth;
  var h = element.offsetHeight;
  
  return new xdo.lang.Rectangle(x, y, w, h);  
}

/**
 * returns rectangle object of the element 
 * (based on the visible client window area). Returned value
 * can be compared with event position
 * 
 * @param {Element} element
 * @returns {xdo.lang.Rectangle}
 */
DOMElement.getViewportPos = function (element)
{
  element = DOMElement.getElement(element);
  if (element == null) return null;
  
  // target element will include border rectangle
  var x = element.offsetLeft;
  var y = element.offsetTop;
  var w = element.offsetWidth;
  var h = element.offsetHeight;
  
  // IE returns 0px for element height and bottom position for 'offsetTop' for inline component.
  if (xdo.Browser.isIE() && element.style.display == 'inline')
  {
    y -= element.scrollHeight;
    h += element.scrollHeight;
  }
  
  if (xdo.Browser.isIE())
  {
    x += element.clientLeft;
    y += element.clientTop;
  }

  var rect = new xdo.lang.Rectangle(x, y, w, h);

  var offsetParent = element.offsetParent;
  element = element.parentNode;
  while (element != null)
  {
    if (element == offsetParent) 
    {
      rect.x += element.offsetLeft;
      rect.y += element.offsetTop;
      
      offsetParent = offsetParent.offsetParent;
    }
        
    // clip rectangle, if necessary
    if (element.offsetWidth < element.scrollWidth ||
        element.offsetHeight < element.scrollHeight)
    {
      rect.x -= element.scrollLeft;
      rect.y -= element.scrollTop;

      rect.clip({x:element.offsetLeft,
                 y:element.offsetTop,
                 width: element.offsetWidth,
                 height: element.offsetHeight});
    }

    if (xdo.Browser.isIE()) 
    {
      rect.x += element.clientLeft;
      rect.y += element.clientTop;
    }

    if (element.tagName == "BODY") break;
    element = element.parentNode;    
  }

  // check html's scroll position
  rect.x -= document.documentElement.scrollLeft;
  rect.y -= document.documentElement.scrollTop;
  
  return rect;
}

/**
 * returns the rectangle information of the specified element from
 * the document top (it might be hidden because of scrolling)
 *
 * @param {Element} element target HTML element object
 * @return {xdo.lang.Rectangle} page position
 */
DOMElement.getPagePosition = function(element)
{
  element = DOMElement.getElement(element);
  if (element == null) return null;
  
  // target element will include border rectangle
  var x = element.offsetLeft;
  var y = element.offsetTop;
  var w = element.offsetWidth;
  var h = element.offsetHeight;
  
  if (xdo.Browser.isIE())
  {
    x += element.clientLeft;
    y += element.clientTop;
  }

  var rect = new xdo.lang.Rectangle(x, y, w, h);

  // Bug 10146457
  // WebKit has page scroll information in the BODY tag while other browser contains
  // that information in HTML tag. So set this variable to decide which tag 
  var endTargetTag = (xdo.Browser.isWebKit())?"BODY":"HTML";
  
  var offsetParent = element.offsetParent;
  element = element.parentNode;
  while (element != null)
  {
    if (element.tagName == endTargetTag) break;

    if (element == offsetParent) 
    {
      rect.x += element.offsetLeft;
      rect.y += element.offsetTop;
      
      offsetParent = offsetParent.offsetParent;
    }
        
    // clip rectangle, if necessary
    if (element.offsetWidth < element.scrollWidth ||
        element.offsetHeight < element.scrollHeight)
    {
      rect.x -= element.scrollLeft;
      rect.y -= element.scrollTop;
    }
    
    if (xdo.Browser.isIE()) 
    {
      rect.x += element.clientLeft;
      rect.y += element.clientTop;
    }

    element = element.parentNode;    
  }

  return rect;
}

/**
 * returns the rectangle information of the specified element.
 *
 * @param {Element} element target HTML element object
 * @return {xdo.lang.Point} the top left corner position of target HTML element
 */
DOMElement.getScrollPosition = function(element)
{
  var x=0;
  var y=0;
  
  element = DOMElement.getElement(element);
  while(element && element.scrollTop != null)
  {
     x+=element.scrollLeft;
     y+=element.scrollTop;
     
     element=element.parentNode;
     
     if (!xdo.Browser.isIE())
     {
       if (element != null && element.tagName == 'BODY')
       {
         break;
       }
     }
  }

  return {left:x, top:y};
}

/**
 * sets id value to the id attribute of the element. if null is passed,
 * randomly generate number will be attached to it.
 *
 * @param {Element} element target HTML element object
 * @param {String|Number} id id value, if null is passed or leave it blank,
 * randomly generate number is set.
 */
DOMElement.setID = function(element, id)
{
  if (id == null)
  {
    do
    {  
      id = Math.ceil(Math.random()*10000);
    }
    while (document.getElementById(id) != null);
  }
  
  element.id = id;
}

/**
 * check if specified object has render function or not
 * @param {Object} obj object to check.
 * @return {Boolean} true if specified object has render(),false if not.
 * @private
 */
DOMElement.pHasRender = function(obj)
{
  return (obj != null) && (typeof(obj.render) == "function");
}

/**
 * check if specified object has attachEvents function or not
 * @param {Object} obj object to check
 * @return {Boolean} true if specified object has attachEvents(), false if not.
 * @private
 */
DOMElement.pHasAttachEvents = function(obj)
{
  return (obj != null) && (typeof(obj.attachEvents) == "function");
}

/**
 * returns element object from id.
 * @param {Element|String} element or id string
 * @return {Element} element object
 */
DOMElement.getElement = function (elem)
{
  if (elem == null) return null;
  
  if (elem.nodeType != 1)
  {
    elem = document.getElementById(elem); 
  }
  return elem;
}

/**
 * appends object to the end of childNodes collection
 *
 * @param {Element|String} element target HTML element object or id string for the target element
 * @param {Element|String} object HTML Element, HTML string or xdo.widget.Widget derived object
 */
DOMElement.append = function(element, object) 
{
  element = DOMElement.getElement(element);
  if (element == null) return null;
  
  var contents = object;
  if (DOMElement.pHasRender(contents))
  {
    contents = object.render();
  }
  
    
  if(typeof(contents) == "string")
  {
// if html chunk that contains iframe is modified using 'innerHTML+=html' statement,
// iframe content is reloaded and the change in the iframe will be lost.
//    element.innerHTML += contents;
// 'appendChild' is used instead.
    if (document.createRange) {
      var rangeObj = document.createRange();
      rangeObj.selectNodeContents(element);
      if (rangeObj.createContextualFragment) {
        try
        {
          var documentFragment = rangeObj.createContextualFragment(contents);
          element.appendChild(documentFragment);
        }
        catch (e)
        {
          if (window.console)
          {
            console.info("HTML ["+contents+"] can not be handled by createContextualFragment");
          }
          
          // createcontextualFragment throws exception with '<link>' or '<script>'
          // use old way to do that
          DOMElement._classicAppend(element, contents);
        }
      } else {
        DOMElement._classicAppend(element, contents);
      }
    } else{
      DOMElement._classicAppend(element, contents);
    }
    
    // reattach event handler
//    var len = element.childNodes.length;
//    for (var i=0; i<len; i++)
//    {
//      var c = element.childNodes[i];
//      this.pReattachEventHandler(c);
//    }  
  }
  else if (object.nodeType == 1 || object.nodeType == 3) /* if object is element */
  {
    element.appendChild(contents);
  }

  // instead of attachEvent, call object's attachEvent method
  if (this.pHasAttachEvents(object))
  {
    object.attachEvents();
  }  
}

DOMElement._classicAppend = function(element, contents)
{
  var dummyDiv = document.createElement('div');
  dummyDiv.innerHTML = contents;
  for (var i=0, len=dummyDiv.childNodes.length; i<len; i++)
    element.appendChild(dummyDiv.childNodes[0]);
}

/**
 * synonym of {@link #.append}
 * @function
 * @deprecated use append() method instead
 */
DOMElement.appendElement = DOMElement.append;

/**
 * appends object to the end of childNodes collection
 *
 * @param {Element|String} object HTML Element or HTML string
 * @param {Element} reference HTML element. object will be inserted before 
 * this object.
 */
DOMElement.insertBefore= function(object, reference) 
{
  reference = DOMElement.getElement(reference);
  if (reference == null) return;
  
  var element = reference.parentNode;
  if (element == null) return;

  var contents = object;
  if (DOMElement.pHasRender(contents))
  {
    contents = object.render();
  }

  if(typeof(contents) == "string")
  {
    // make it HTML object
    var div = document.createElement('div');
    div.innerHTML = contents.replace(/^\s*|\s*$/g, ''); /* trim leading/trailing spaces */
    
    if (div.childNodes.length == 1)
    {
      contents = div.firstChild;
    }
    else
    {
      contents = div;
    }
  }
  element.insertBefore(contents, reference);
  
  // reattach event handler
  var len = element.childNodes.length;
  for (var i=0; i<len; i++)
  {
    var c = element.childNodes[i];
    this.pReattachEventHandler(c);
  }  
  
  // attach not-yet-attached event
  xdo.event.JSEvent.attachEvent();
  
  if (this.pHasAttachEvents(object))
  {
    object.attachEvents();
  } 
}

/**
 * synonym of {@link #.insertBefore}
 * @function
 * @param {Element|String} object HTML Element or HTML string
 * @param {Element} reference HTML element. object will be inserted before 
 * @deprecated use insertBefore() isntead
 */
DOMElement.insertElementBefore = DOMElement.insertContentsBefore;

/**
 * synonym of {@link #.append}
 * 
 * @param {Element} element target HTML element object
 * @param {Element|String} object HTML Element or HTML string
 * @function
 * @deprecated use append() instead
 */
DOMElement.appendChild = DOMElement.append;

/**
 * reattach event handler
 *
 * @param {Element} elem HTML element
 * @private
 */
DOMElement.pReattachEventHandler = function(elem)
{
  if (elem.nodeType != 1)
  {
     return;
  }
  
  // get attached event of this element
  xdo.event.JSEvent.reAttachEvent(elem);
     
  // find children
  var len = elem.childNodes.length;
  for (var i=0; i<len; i++)
  {
    var c = elem.childNodes[i];
    this.pReattachEventHandler(c);
  }

  return;
}


/**
 * clears current childNodes collection and appends object to it
 * NOTE: it is not compatible with drag and drop framework
 *
 * @param {Element} element HTML Element to be appended.
 * @param {Element|String|xdo.widget.Widget} object HTML Element, HTML string or Widget object
 * @param {Boolean} clearEvent flag to clear attached event or not, true is default 
 */
DOMElement.setNew = function(element, object, clearEvent) 
{
  clearEvent = (clearEvent == null)?true:false;
  element = DOMElement.getElement(element);
  if (element == null) return null;
  
  // detach event first
  if (clearEvent)
  {
    var len = element.childNodes.length;
    for (var i=0; i<len; i++)
    {
      var child = element.childNodes[i];
      xdo.event.JSEvent.detachAllEventsRecursively(child);
    }
  }
  
  // set new element
  var contents = object;
  if (DOMElement.pHasRender(contents))
  {
    contents = object.render();
  }

  if (element.cloneNode != null && element.parentNode != null)
  {
    var oldElem = element;
    var newElem = element.cloneNode(false);
    
    if(typeof(contents) == "string")
    {
      newElem.innerHTML = contents;
    }
    else if (object.nodeType == 1 || object.nodeType == 3) /* if object is element */
    {
      newElem.appendChild(contents);
    }
    oldElem.parentNode.replaceChild(newElem, oldElem);
    element = newElem;
  }
  else
  {
    if(typeof(contents) == "string")
    {
      element.innerHTML = contents;
    }
    else if (object.nodeType == 1 || object.nodeType == 3) /* if object is element */
    {
      element.innerHTML = "";
      element.appendChild(contents);
    }
  }
  
  // attachEvent
  // instead of attachEvent, call object's attachEvent method
  if (this.pHasAttachEvents(object))
  {
    object.attachEvents();
  }
  
  return element;
}


/**
 * clears current childNodes collection and appends object to it
 *
 * @param {Element} element HTML Element to be appended.
 * @param {Element|String|xdo.widget.Widget} object HTML Element, HTML string or Widget object
 * @param {Boolean} clearEvent flag to clear attached event or not, true is default 
 */
DOMElement.set = function(element, object, clearEvent) 
{
  clearEvent = (clearEvent == null)?true:false;
  element = DOMElement.getElement(element);
  if (element == null) return null;
  
  // detach event first
  if (clearEvent)
  {
    // this can be differable
    var len = element.childNodes.length;
    for (var i=0; i<len; i++)
    {
      xdo.event.JSEvent.detachAllEventsRecursively(element.childNodes[i]);
    }
  }
  
  element.innerHTML = "";
  DOMElement.append(element, object);
  return element;
}

/**
 * synonym of {@link #.set}
 * @param {Element} element HTML Element to be appended.
 * @param {Element|String|xdo.widget.Widget} object HTML Element, HTML string or Widget object
 * @param {Boolean} clearEvent flag to clear attached event or not, true is default 
 * @function
 * @deprecated use set() instead
 */
DOMElement.setElement = DOMElement.set;


/**
 * set class name to the HTML element. This method clears exisiting
 * class name before setting
 * 
 * @param {Object} element html element
 * @param {Object} className class name
 */
DOMElement.setClass = function (element, className)
{
  element = DOMElement.getElement(element);  
  if (!element || !className) return;
  element.className = className;
}

/**
 * adds class name to the specified HTML Element.<br/>
 * This method adds one more className, if className is already set to the
 * element.
 *
 * @param {Element|String} element target HTML element object or id string for the HTML element
 * @param {String} className class name to add (append)
 */
DOMElement.addClass = function(element, className)
{
  element = DOMElement.getElement(element);  
  if (!element || !className) return;
  
  if (!DOMElement.isTargetClass(element, className))
  {
     var cn  = (element.className)?element.className:"";
     var classArray = cn.split(' ');
     classArray.push(className);
     element.className = classArray.join(' ');
  }
}

/**
 * removes class name from the specified HTML element.<br/>
 * This method will not clear the class names other than specified class name.
 *
 * @param {Element} element taget HTML element object
 * @param {String} className class name to remove
 */
DOMElement.removeClass = function(element, className)
{
  element = DOMElement.getElement(element);
  if (!element || !element.className || !className) return;
  var r = new RegExp(className);
  if (element.className.search(r) != -1)
  {
    var classArray = element.className.split(' ');
    for (var i=0; i<classArray.length; i++)
    {
      if (classArray[i] == className)
      {
        classArray.splice(i,1);
        i--;
      }
    }
    element.className = classArray.join(' ');
  }
}

/**
 * tests HTML element has specified class name in the class attribute.<br/>
 *
 * @param {Element} element taget HTML element object
 * @param {String} className class name to remove
 * @return {Boolean} true if html element contains specified class name, false otherwise.
 */
DOMElement.isTargetClass = function(element, className)
{
  element = DOMElement.getElement(element);
  
  if (element == null || element.nodeType != 1 || element.className == null || typeof(element.className) != "string") return false;
  var classArray = element.className.split(' ');
  var i, j;
  for (i=0; i<classArray.length; i++)
  {
    if (className.constructor == Array)
    {
      for (j=0; j<className.length; j++)
      {
        if (classArray[i] == className[j])
        {
          return true;
        }
      }
    }
    else
    {
      if (classArray[i] == className)
      {
        return true;
      }
    }
  }
  
  return false;
}

/**
 * removes specified element from the HTML DOM Tree
 *
 * @param {Element} element element to be removed.
 * @param {Boolean} detachEvent the flag to detach event also
 *                  (optional, default is true);
 *
 */
DOMElement.removeElement = function (element, detachEvent)
{
  element = DOMElement.getElement(element);  
  if (element == null || element.parentNode == null) return;
  
  detachEvent = (detachEvent == null)?true:detachEvent;

  // detach event
  if (detachEvent)
  {
    xdo.event.JSEvent.detachAllEventsRecursively(element);
  }
  
  if (element.parentNode != null)
  {
    element.parentNode.removeChild(element);
  }
}

/**
 * synonym of {@link #.removeElement}
 * 
 * @param {Element} element element to be removed.
 * @param {Boolean} detachEvent the flag to detach event also
 *                  (optional, default is true);
 * @function
 * @deprecated use removeElement() instead
 */
DOMElement.removeChild = DOMElement.removeElement;

/**
 * returns Body dimension (clientWidth/clientHeight)
 * @return {xdo.lang.Dimension} body dimension
 */
DOMElement.getBodyDimension = function()
{
  var width = document.documentElement.clientWidth || document.body.clientWidth || document.body.scrollWidth;
  var height = document.documentElement.clientHeight || document.body.clientHeight || document.body.scrollHeight;
  return new xdo.lang.Dimension(width, height);
}

/**
 * scrolls contents of the specified element
 *
 * @param {Element} elem element to scroll
 * @param {Number} x scroll x value, if it is 0 or null, scroll won't happen
 * @param {Number} y scroll y value, if it is 0 or null, scroll won't happen
 */
DOMElement.scroll = function (elem, x, y)
{
  elem = DOMElement.getElement(elem);
  if (elem == null) return;
  
  if (x != null)
  {
    elem.scrollLeft += x;
  }
  
  if (y != null)
  {
    elem.scrollTop += y;
  } 
}


/**
 * Returns number of attributes specified for an element.
 * IE lists all possible attributes whether they are specified or not.
 * To fix this buggy behavior, we check each attribute if it's explicitly specified.
 * http://snipt.net/pdokas/iterating-over-dom-attributes/
 */
DOMElement.countAttributes = function(elem)
{
  var length = elem.attributes.length;
  
  if (xdo.Browser.isIE())
  {
    length = 0;
    for (var i = 0; i < elem.attributes.length; i++)
    {
      var attribute = elem.attributes[i];
      if (attribute.specified)
        length++;
    }
  }
  
  return length;
}

/**
 * Utility method to get list of attribute names for iteration.
 * getAttributeNames is not a method defined in DOM Level2.
 */
DOMElement.getAttributeNames = function(elem)
{
  var names = [];
  
  for (var i = 0; i < elem.attributes.length; i++)
  {
    var attribute = elem.attributes[i];
    
    if ('specified' in attribute? attribute.specified: true)
      names.push(attribute.nodeName);
  }
  
  return names;
}

/**
 * Returns true if element has attribute with specified name, otherwise returns false.
 * IE doesn't support DOM Level2 API. hasAttribute method is not supported in IE.
 */
DOMElement.hasAttribute = function(elem, attrName)
{
  return elem.hasAttribute? elem.hasAttribute(attrName): elem.getAttribute(attrName) !== null;
}

})();


(function(){
xdo.bind("xdo.event.JSEvent", JSEvent);

xdo.require("xdo.Browser");
xdo.require("xdo.lang.Dimension");
xdo.require("xdo.lang.Rectangle");
xdo.require("xdo.lang.Point");
xdo.require("xdo.event.EventList");
//xdo.require("xdo.log.LogWindow");
xdo.require("xdo.dom.DOMElement");

/**
 * Can not be instantiated.
 *
 * @class collection of event related handling static methods
 * Can be referenced through <strong>xdo.event.JSEvent</strong>.
 */
function JSEvent()
{
}

/**
 * returns Event, it works with 
 *
 * @param {Event} e event object, this might be null with IE browser.
 * @return {Event} Event object
 */
JSEvent.getEvent = function(e)
{
  if (e == null && xdo.Browser.isIE())
  {
    return window.event;
  }
  
  return e;
}

/**
 * stop event propagation.
 *
 * @param {Event} e event object
 */
JSEvent.stopPropagation = function (e)
{
  if (e.cancelBubble!=undefined)
    e.cancelBubble = true;
  if (e.stopPropagation)
    e.stopPropagation();
}

/**
 * Prevent default event
 *
 * @param {Event} e event object
 */
JSEvent.preventDefault = function (e)
{
  if (e.preventDefault){
    e.preventDefault();
  } else {
    e.returanValue = false;
  }
}


/**
 * returns key code
 * @return {Number} key code
 */
JSEvent.getKeycode = function (e)
{
  return (xdo.Browser.isIE()) ? e.keyCode : e.which;
}

/**
 * returns mouse button code
 * @param {Event} e
 * @return {Number} mouse button code<br/>
 * 0 = none <br/>
 * 1 = left (depends on browser)<br/>
 * 2 = right<br/>
 */
JSEvent.getMousebutton = function (e)
{
  if (xdo.Browser.isIE())
  {
    return (e.button);
  }
  if (xdo.Browser.isMozilla() || xdo.Browser.isWebKit())
  {
    return (e.which);
  }
}

/**
 * returns the HTML element that event occurrs.
 *
 * @param {Event} e event object
 * @return {Element} element where event is fired
 */
JSEvent.getEventTarget = function (e)
{
  if (e._target != null)
  {
    return e._target;
  }

  if (xdo.Browser.isIE())
  {
    return e.srcElement;
  }
  
  return e.target;
}


/**
 * returns the (x, y) point where event occurred.
 *
 * @param {Event} e event object
 * @returns {Point} x, y position object
 */

JSEvent.getEventPos = function(e)
{
  if (xdo.Browser.isIE())
  {
    return {x:(e.clientX + document.body.scrollLeft),
      y:(e.clientY + document.body.scrollTop)};
  }
  else if (xdo.Browser.isMozilla())
  {
    var dum = {x:(e.clientX + document.body.scrollLeft),
        y:(e.clientY + document.body.scrollTop)};
    //var dum2 = {x:e.pageX, y:e.pageY};
    return dum;
  }
  else if (xdo.Browser.isWebKit())
  {
    return {x:e.clientX, y:e.clientY};
  }
  
  return new xdo.lang.Point(e.pageX, e.pageY);
}
/**
 * @param {event} event
 * @return {boolean} true if it's ctrl clik or comman click in case of Mac
 */
JSEvent.isControlClick = function(event){
    if(event != null) {
      if(typeof event.modifiers == 'undefined'){
        return event.ctrlKey || event.metaKey;	  
      } else {
        return  event.modifiers&Event.CONTROL_MASK;  
      }	
    }
    return false;	  
 }

/**
 * attach event. the difference from attachEvent is clearing previously
 * attached events (to the same event name) so that only specified
 * event handler is called.
 * 
 * @param {Element} elem element object (required)
 * @param {String} eventName event name (required)
 * @param {Function} handler handler function
 * @param {Boolean} useCapture specifying event capture or event bubble (optional)
 * (it is ignored by IE.  IE only supports event bubble.)
 */
JSEvent.setEvent = function (elem, eventName, handler, useCapture)
{
  JSEvent.detachEvent(elem, eventName);
  JSEvent.attachEvent(elem, eventName, handler, useCapture);
}

/**
 * attach event. Except first argments (for specifying element object),
 * others are same as W3C's addEventListener(). And it works with other 
 * browsers
 *
 * @param {Element} elem element (or document) object to be attached event. 
 * @param {String} eventName event name 
 * @param {Function} handler event handler function
 * @param {Array} param parameters array
 * @param {Boolean} useCapture specifying event capture or event bubble (optional)
 * (it is ignored by IE.  IE only supports event bubble.)
 */
JSEvent.attachEvent = function (elem, eventName, handler, param, useCapture)
{
   if (!elem) return;

  useCapture = (useCapture == null)?false:useCapture;

  // onerror handler is different from other event handlers.
  if (elem==window && eventName=="onerror")
  {
    if (window.onerror)
    {
      throw new Error('Only one error handler can be assigned.');
    }
    
    window.onerror = handler;
    return;
  }
  
  JSEvent.pAttachEvent(elem, eventName, handler, param, useCapture);
}


/**
 * normalize event name string.  remove 'on' prefix and
 * make them lower case.
 * 
 * ex.<br/>
 * "onclick" -> "click"
 * "BLUR" -> "blur"
 * "mousedown" -> "mousedown"
 * null -> null
 * 
 * @param {String} eventName  event name string
 * @return {String} normalized event name
 */
JSEvent.pNormalizeEventName = function (eventName)
{
  // normalize eventName
  // remove on keyword from evnetName
  if (eventName != null)
  {
    eventName = eventName.toLowerCase();
    if (eventName.charAt(0) == 'o' && eventName.charAt(1) == 'n')
    {
      eventName = eventName.substr(2);
    }
  }
  
  return eventName;
}

/**
 * actual attach event operation. JSEvent.attachEvent will also take care of
 * checking event queue to be attached. Separated method is created.
 *
 * @param {Element} elem element (or document) object to be attached event. 
 * @param {String} eventName event name 
 * @param {Function} handler event handler function
 * @param {Array} param parameters array
 * @param {Boolean} useCapture specifying event capture or event bubble
 * (it is ignored by IE.  IE only supports event bubble.)
 *
 * @private
 */ 
JSEvent.pAttachEvent = function (elem, eventName, handler, param, useCapture)
{
  // normalize eventName
  eventName = JSEvent.pNormalizeEventName(eventName);

  attachedHandler = handler;
  var eventInfo = {elem: elem,
                   eventName: eventName,
                   handler: handler,
                   attachedHandler: attachedHandler,
                   param: param,
                   useCapture: useCapture};

  // if elem is String or Number (id)
  if (typeof(elem) == "string" || typeof(elem) == "number")
  { 
    var id = elem;
    elem = document.getElementById(id);
    if (elem == null)
    {
      return;
    }
    else
    {
      eventInfo.elem = elem;
    }
  }
  
  // add elem.id forcely
  if (elem.id == "")
  {
    var id = null;  
    do
    {  
      id = Math.ceil(Math.random()*10000);
    }
    while (document.getElementById("ev"+id) != null);
    elem.id = "ev"+id;
  }

  var q = null;
  if ((q = JSEvent.pAttachedEvent.hasEntry(eventInfo)) != null)
  {
    // already attached
    if (q.elem != eventInfo.elem)
    {
      // element is updated
      xdo.event.JSEvent.pDetachEvent(q.elem, q.eventName, q.handler, q.useCapture);
      xdo.event.JSEvent.pAttachedEvent.remove(q);
    }
    else
    {
      return;
    } 
  }

  /* if id is null or empty string, id will be added to distinguish 
   * event attached element.
   */
  if (elem.id == null || elem.id == "")
  {
    xdo.dom.DOMElement.setID(elem, null);
  }
  
  eventInfo.attachedHandler = JSEvent.createAttachHandler(elem, eventName, handler, param);  
  
  var handlerToAttach = eventInfo.attachedHandler;
//  xdo.log.LogWindow.writeLn("Attach Event Handler "+elem.id+"."+eventName);
  
  // need special handler for the unload event to make sure
  // xdo.cleanup() will be called at the end.
  if (eventName == "unload") 
  {
    var eventList = JSEvent.pAttachedEvent.getEventList(elem);
    if (eventList == null || eventList[eventName] == null) 
    {
      handlerToAttach = JSEvent._createUnloadHandler(elem, eventName, param);
      if (xdo.Browser.isIE()) 
      {
        elem.attachEvent("on" + eventName, handlerToAttach);
      }
      else 
      {
        elem.addEventListener(eventName, handlerToAttach, useCapture);
      }
    }
  }
  else 
  {
    if (xdo.Browser.isIE()) 
    {
      elem.attachEvent("on" + eventName, handlerToAttach);
    }
    else 
    {
      elem.addEventListener(eventName, handlerToAttach, useCapture);
    }
  }
  
  JSEvent.pAttachedEvent.add(eventInfo);
}

/**
 * static method to create handler. To minimize memory space, this part is separated
 * from the pAttachEvent method
 * 
 * @param {Element} elem
 * @param {String} eventName event name
 * @param {Function} handler
 * @param {Array} param
 */
JSEvent.createAttachHandler = function (elem, evName, handler, param)
{
  evName = "on"+evName;
  return function(e)
  {
     var ret = true;
     
     // should we differ finding hanlder function or not?
     if (typeof(handler) != "function"
          && typeof(handler[evName]) == "function")
     {
       ret = handler[evName].call(handler, e, elem, param); 
     }
     else
     {
       ret = handler.call(elem, e, param);
     }
     
     // Return value of "beforeunload" event handler has special meaning.
     // If a string is returned, the dialog which says "Are you sure you want to navigate away from this page?" will be shown 
     // and the returned string will be displayed in some browsers.
     // If nothing is retuened (ret === undefined), the page will be unloaded without showing the dialog.
     if (e.type === "beforeunload") {
       // For IE8 and less and FireFox3 and less.
       if (ret !== undefined) {
         e.returnValue = ret;
       }
       
       return ret;
     }
     
     ret = (ret != null) ? ret : true;
     
     if (!ret)
     {
       if (e && e.preventDefault)
         e.preventDefault();
       else if (window.event)
         window.event.returnValue = false;
     }
     
     return ret; 
  }
}

JSEvent._createUnloadHandler = function (elem, evName, param)
{
  return function(e)
  {
    var eventList = JSEvent.pAttachedEvent.getEventList(elem);
    if (eventList == null) return;
    
    var handlerArray = eventList[evName];
    if (handlerArray == null) return null;
   
    // call attached event handler
    // I think we can ignore the return values.
    for (var i=1; i<handlerArray.length; i++)
    {
      handlerArray[i].attachedHandler.call(elem, e, param);
    }
    
    // make sure first unload is called at the end.
    // because first set event handler "xdo.cleanup()"
    // (it is set in the xdo.js) 
    // clears all of the attached event handlers
    handlerArray[0].attachedHandler.call(elem, e, param);
  }  
}

/**
 * check the event handler is already attached or not
 * 
 * @param {String|Element} elem element id string or Element object
 * @param {String} eventName
 */
JSEvent.isAttached = function (elem, eventName, handler, useCapture)
{
  useCapture = (useCapture == null)?false:useCapture;
  eventName = JSEvent.pNormalizeEventName(eventName);  
  var events = JSEvent.pAttachedEvent.getEventList(elem);
  if (events == null) return false;
  
  /* just checking element */
  if (eventName == null) return true;
  
  /* element and eventName */ 
  for (var evName in events)
  {
    if(eventName != null && evName == eventName)
    {
      if (handler == null)
      {
        return true;
      }
      
      for (var i=0; i<events[evName][i]; i++)
      {
        if (handler == events[evName][i].handler)
        {
          if (useCapture == events[evName][i].useCapture)
          {
            return true;
          } 
          else
          {
            return false;
          }  
        }
      }
      
      return false;
    }
  }
  
  return false;
}

/**
 * reattaches all of previously attached event to this HTML element
 */
JSEvent.reAttachEvent = function (elem)
{
  var events = JSEvent.pAttachedEvent.getEventList(elem);
  for (var evName in events)
  {
    var ary = events[evName];
    if (ary != null)
    {
      var len = ary.length;
      for (var i=0; i<len; i++)
      {
        var info = ary[i];
        if (elem.id == info.elem.id)
        {
          var eventName = info.eventName;
          var attachedHandler = info.attachedHandler;
          var useCapture = info.useCapture;
          
          if (xdo.Browser.isIE())
          {
            elem.attachEvent("on"+eventName, attachedHandler);
          }
          else
          {
            elem.addEventListener(eventName, attachedHandler, useCapture);
          }

          info.elem = elem;  
        }
      }
    }
  }
}

/**
 * detach event from html element
 *  
 * @param {Element} elem      HTML element
 * @param {String} eventName normalized event name
 * @param {Function} handler   event handler
 * @param {Boolean} useCapture flag to use event capture (or event bubble) 
 */ 
JSEvent.detachEvent = function (elem, eventName, handler, useCapture)
{
  useCapture = (useCapture == null)?false:useCapture;
  
  if (typeof(elem) == "string" || typeof(elem) == "number")
  {
    elem = document.getElementById(elem);
    if (elem == null) return;
  }
  
  // onerror handler is different from other event handlers.
  if (elem==window && eventName=="onerror")
    window.onerror = null;
  
  // normalize eventName
  eventName = JSEvent.pNormalizeEventName(eventName);  

  // remove event in the queue
  var eventinfo = new Array;

  var info = {};
  var events = JSEvent.pAttachedEvent.getEventList(elem);
  if (events == null) return;
  var evAry;
  var len;

  if (eventName == null)
  {
    for (var evName in events)
    {
      evAry = events[evName];
      len = evAry.length;
      for (var i=0; i<len; i++)
      {
        eventinfo.push(evAry[i]);
      }
    }
  }
  else
  {
    evAry = events[eventName];
    if (evAry != null)
    {
      len = evAry.length;
      for (var i=0; i<len; i++)
      {
        var info = evAry[i];
        if (handler == null)
        {
          eventinfo.push(info);
        }
        else
        {
          if (handler == info.handler)
          {      
            if (useCapture == null)
            {
              eventinfo.push(info);
            }
            else if (useCapture == info.useCapture)
            {
              eventinfo.push(info);
            }
          }          
        }
      }
    }
  }

  len = eventinfo.length;
  for (i=0; i<len; i++)
  {
    var evName = eventinfo[i].eventName;
    var h      = eventinfo[i].attachedHandler;
    var useC   = eventinfo[i].useCapture;

    JSEvent.pDetachEvent(elem, evName, h, useC);
    JSEvent.pAttachedEvent.remove(eventinfo[i]);
  }
}

/**
 * detach all events
 * @param {Object} elem
 */
JSEvent.detachAllEventsRecursively = function (elem)
{
  if (elem.nodeType != 1 && elem.nodeType != 9) return;
  JSEvent.detachEvent(elem);
  if (xdo.dnd != null)
  {
    xdo.dnd.DnDManager.detachDnD(elem);
  }
  
  var len = elem.childNodes.length;
  for (var i=0; i<len; i++)
  {
    JSEvent.detachAllEventsRecursively (elem.childNodes[i])
  }
}

/**
 * actual attach event operation. JSEvent.attachEvent will also take care of
 * checking event queue to be attached. Separated method is created.
 *
 * @param {Element} elem element (or document) object to be attached event. 
 * @param {String} eventName event name  (optional, all event handlers
                   will be removed in that case.)
 * @param {Function} handler event handler function (optional,
 *                   all attached event handlers will be removed in that case.
 * @param {Boolean} useCapture specifying event capture or event bubble (optional)
 * (it is ignored by IE.  IE only supports event bubble.)
 * 
 * @private
 */ 
JSEvent.pDetachEvent = function (elem, eventName, handler, useCapture)
{
//  xdo.log.LogWindow.writeLn("Detach Event Handler "+elem.id+"."+eventName);
    
  if (xdo.Browser.isIE())
  {
    elem.detachEvent("on"+eventName, handler);
  }
  else
  {
    // remove on keyword from evnetName
    elem.removeEventListener(eventName, handler, useCapture);
  }  
}

/**
 * static method to clear all registered event. This method is for the
 * IE6's memory leak bug workaround. It is attached to the winload.unload
 * in the xdo.js.
 *
 */
JSEvent.clearAllEvent = function()
{
  // clear all registered event
  for (var elem in JSEvent.pAttachedEvent.getList())
  {
    var events = JSEvent.pAttachedEvent.getEventList(elem);
    
    for (var evName in events)
    {
      var ary = events[evName];
      if (ary != null)
      {
        var len = ary.length;
        for (var i=0; i<len; i++)
        {
          info = ary[i];      
          if (info == null) break;
          
          var elem   = info.elem;
          var evName = info.eventName;
          var h      = info.attachedHandler;
          var useC   = info.useCapture;
    
//          xdo.log.LogWindow.writeLn("detach "+elem.id+" "+evName);
          
          if (xdo.Browser.isIE())
          {
            elem.detachEvent("on"+evName, h);
          }
          else
          {
            // remove on keyword from evnetName
            elem.removeEventListener(evName, h, useC);
          }
        
          if (JSEvent.pAttachedEvent.remove(info))
          {
            len--; i--;
          }
        }
      }
    }
  }
}


/**
 * IE6 has a memory leak problem when the page is unload and 
 * event handler has recursive reference of the element object.
 * This array keeps attached events and will be used to clear
 * all of them on unloading page.
 *
 * @private
 * @type EventList
 */
JSEvent.pAttachedEvent = new xdo.event.EventList();

})();

xdo.event.JSEvent.attachEvent(window, "onunload", xdo.cleanup);
xdo.event.JSEvent.attachEvent(window, "onload", xdo.startup);

(function(){
xdo.bind("xdo.xml.XMLUtilities", XMLUtilities);

function XMLUtilities()
{
}


/*
 * Creates an xml document and returns it.
 * Branches to handle differences in IE/Mozilla
 * @returns {XMLDoc} 
 */

XMLUtilities.createXMLDocument = function()
{
	var xmlDoc = null;
  
  	if (document.implementation && document.implementation.createDocument)
  	{
    	xmlDoc = document.implementation.createDocument("","",null);
    	xmlDoc.async = false;
  	}
    // code for IE8 or earlier
  	else if (window.ActiveXObject)
    {
      xmlDoc = XMLUtilities.pCreateIEXMLDocument();
      if(xmlDoc != null) {
        xmlDoc.async = false;
      } else {
        window.alert("Problem creating xml document");
      }
    }
  	else
  	{
    	window.alert("Problem creating xml document");//alert(RES_ALERT_CHECKBROWSER);
    	return null;
  	}
  	
  	return xmlDoc;
}

/*
 * Creates an xsl document and returns it.
 * Is different from create XML Document because IE
 * needs a threadsafe xsl document for transformations
 */

XMLUtilities.createXSLDocument = function()
{
	var xslDoc = null;
  
  	// code for Mozilla, etc.
  	if (document.implementation && document.implementation.createDocument)
  	{
    	xslDoc = document.implementation.createDocument("","",null);
    	xslDoc.async = false;
  	}
    // code for IE
  	else if (window.ActiveXObject)
    {
      xslDoc = XMLUtilities.pCreateIEXSLDocument();
      if(xslDoc != null) {
        xslDoc.async = false;
      } else {
        window.alert("Problem creating xsl document");
      }
    }
  	else
  	{
    	window.alert("Problem creating xsl document");//alert(RES_ALERT_CHECKBROWSER);
    	return null;
  	}
  	
  	return xslDoc;
}
 

/*
 * Method for creating xml document in IE.
 * @returns {XMLDoc} returns null if creation not successful
 */

XMLUtilities.pCreateIEXMLDocument = function()
{
	var msxmlSignatures = ["Msxml2.DOMDocument.6.0", "Msxml2.DOMDocument.3.0"];
  	
  //Try each object signature to get lastest object revision
  for(var i=0; i < msxmlSignatures.length; i++)
  {
    try {
      var xmlDoc = new ActiveXObject(msxmlSignatures[i]);
    	return xmlDoc;
    } catch (oError) {
    }
  }

  window.alert("Xml is not supported by this browser");
  return null;
}

/*
 * Method for creating an xsl document in IE.  It is different
 * from XML document because IE needs the xsl document to be
 * in a thread safe DOM for xsl transformations
 * @returns {XSLDoc} returns null if creation unsuccessful,
 *	otherwise it's a thread-safe DOM document
 */

XMLUtilities.pCreateIEXSLDocument = function()
{
	var msDOMSignatures = ["MSXML2.FreeThreadedDOMDocument.6.0", "MSXML2.FreeThreadedDOMDocument.5.0", "MSXML2.FreeThreadedDOMDocument"];
	
	//Try each object signature to get lastest object revision
  	for(var i=0; i < msDOMSignatures.length; i++)
  	{
    	try {
    		var xslDoc = new ActiveXObject(msDOMSignatures[i]);
    		xslDoc.async = false;
    		return xslDoc;
    	} catch (oError) {
    		
    	}
    }
    window.alert("Couldn't create XSL document.");
    return null;
	
}

/*
 * @param {XMLDoc}
 * @param {String} path to data, has to be on same server
 * Takes care of loading data into the xml document,
 * branches for IE/Mozilla differences.
 */

XMLUtilities.loadXMLData = function(xmlDoc, path)
{
	xmlDoc.load(path);
}


/*
 * @returns {DomObject} DOM represention of data
 */
XMLUtilities.loadXMLDataFromString = function(data)
{
	var xmlDoc = XMLUtilities.createXMLDocument();

	if (typeof(DOMParser) != "undefined") 
	{
		var parser = new DOMParser();
		xmlDoc = parser.parseFromString(data, "text/xml");
	}
	// Old IE
	else if(window.ActiveXObject)
  {
    xmlDoc.loadXML(data);
  }
  else
  {
    xmlDoc = null;
  }
	
	return xmlDoc;
}

/*
 * @param {Node} XML node to retrieve text from
 * Given the passed in node it returns the text value
 * for that node.
 */

XMLUtilities.getTextValue = function(node)
{
  var t = '';
  var length = node.childNodes.length;
  for (var i=0; i<length; i++)
  {
    var textNode = node.childNodes[i];

    // collect text or cdata section
    // until other types of elements comes
    if (textNode.nodeType != 3  
         && textNode.nodeType != 4) break;
    
    t += textNode.nodeValue;
  }
  
  t = t.replace(/^\s+/,"");
  t = t.replace(/\s+$/,"");
  return t;
}

/*
 * @param {node} Element to attach attribute to
 * @param {String} Key to use for attribute
 * @param {String} value to use for attribute
 * Sets the passed in attribute key/value pair on the passed in node.
 * If the value is === null, it does not set the attribute.
 */

XMLUtilities.setAttribute = function(elem, attr, val)
{
  if (val !== null) {
    elem.setAttribute(attr, val);
  }
}

/*
 * @param {XMLDoc}
 * @param {Node} Parent node to append to
 * @param {String} Text to append
 * @param {Node} Node to add text to
 * Creates a text node with the passed in text 
 * and appends it to the parent node.
 */

XMLUtilities.appendTextNode = function (doc, elem, text, node)
{
  if (text != null && text.length > 0)
  {
    var target = elem;
    if (node != null)
    {
      target = node;
      elem.appendChild(node);
    }

    target.appendChild(doc.createTextNode(text));
  }
}

/**
 * Escapes characters to make the parameter 'name'
 * a valid element name
 * 
 * @param {String} original element name
 * @return {String} valid element name
 */
XMLUtilities.getElementName = function (name)
{
  name = name.replace(/\u0022/g, "_"); // " (double quote)
  name = name.replace(/\u003c/g, "_"); // < (less than)
  name = name.replace(/\u003e/g, "_"); // > (greater than)
  name = name.replace(/\u0026/g, "_"); // & (ampersand)
  name = name.replace(/\s/g, "_");
  return name;
}

/**
 * @param {node} xml node to serialize
 * @return {String} xml string
 * serialize xml node into string
 */

XMLUtilities.serializeNode = function(node)
{
  // NOTE:
  // XMLSerializer.serializeToString fails in IE9 if the node passed as argument is from Ajax response (XMLHttpRequest.responseXML).
  // Until IE9 will be de-supported, IE-specific way (.xml) has to be tried in the first place. This browser bug was fixed in IE10.
  
  if (node.xml !== undefined){
    // IE specific way
    return node.xml;
  } else if (window.XMLSerializer !== undefined) {
    // Standard way
    return new XMLSerializer().serializeToString(node);
  } else if (node.outerHTML !== undefined) {
    return node.outerHTML;
  } else {
    throw new Error ("Could not serialize xml node.");
  }
}


/*
 * @param {XMLDoc} XMLDoc to use for xpath expression evaluation
 * @param {String} Xpath expression
 * @returns {Array} 
 * Evaluates the xpath expression on the xmldoc and branches to
 * handle IE/Mozilla differences.
 */

XMLUtilities.selectNodes = function(xmlDoc, xPath)
{
	var lstNodes = [];
	
	if(xdo.Browser.isIE())
	{
		lstNodes = xmlDoc.documentElement.selectNodes(xPath);
	} 
	else // Needs to be updated to handle non-Mozilla browsers
	{
		lstNodes = XMLUtilities.pMozillaSelectNodes(xmlDoc, xPath);
	}
	
	return lstNodes;
}

/*
 * Method to handle xpath evaluation in mozilla
 */

XMLUtilities.pMozillaSelectNodes = function(xmlDoc, xPath)
{
	var evaluator = new XPathEvaluator();
	var result = evaluator.evaluate(xPath, xmlDoc.documentElement, null, XPathResult.ORDERED_NODE_ITERATOR_TYPE, null);
	
	var nodeLst = [];
	
	if(result != null)
	{
		var elem = result.iterateNext();
		while(elem) 
		{
			nodeLst.push(elem);
			elem = result.iterateNext();
		}
	}
	
	return nodeLst;
}

/*
 * @param {XMLDoc} XMLDoc to use for xpath expression evaluation
 * @param {String} Xpath expression
 * @returns
 * Evaluates the xpath expression on the xmldoc and returns the first
 * result
 */

XMLUtilities.selectSingleNode = function(xmlDoc, xPath)
{	
	if(xdo.Browser.isIE())
	{
		return xmlDoc.documentElement.selectSingleNode(xPath);
	} 
	else // Needs to be updated to handle non-Mozilla browsers
	{
		return XMLUtilities.pMozillaSelectSingleNode(xmlDoc, xPath);
	}
}

XMLUtilities.pMozillaSelectSingleNode = function(xmlDoc, xPath)
{
	var evaluator = new XPathEvaluator();
	var result = evaluator.evaluate(xPath, xmlDoc.documentElement, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
	
	if(result != null)
	{
		return result.singleNodeValue;
	}
	
	return null;
}

/*
 * @param {xmlDoc} XML to be transformed
 * @param {xslDoc} xsl stylesheet to use
 * @param {Array} array of key/value objects to use as parameters
 * @returns {String} representation of transformed xml doc
 *
 * Sample Usage
 * ------------
 * var xmlDoc = xdo.xml.XMLUtilities.createXMLDocument();
 * xdo.xml.XMLUtilities.loadXMLData(xmlDoc, "reports/cdcatalog.xml");
 * var xslDoc = xdo.xml.XMLUtilities.createXSLDocument();
 * xdo.xml.XMLUtilities.loadXMLData(xslDoc, "reports/cdcatalog.xsl");
 *
 * var parameters = [];
 * parameters["title"] = "CD Collection";
 *
 * var result = xdo.xml.XMLUtilities.transformNode(xmlDoc, xslDoc, parameters);
 */
XMLUtilities.transformNode = function(xmlDoc, xslDoc, parameters)
{
	if(xdo.Browser.isIE())
	{
		return XMLUtilities.pProcessIEXSL(xmlDoc, xslDoc, parameters);
	}
	else //TODO: Should not default to Mozilla
	{
		return XMLUtilities.pProcessMozillaXSL(xmlDoc, xslDoc, parameters);
	}
}

XMLUtilities.pCreateIEXSLTemplate = function()
{
	var msTemplateSignatures = ["MSXML2.XSLTemplate.6.0", "MSXML2.XSLTemplate.5.0", "MSXML2.XSLTemplate.4.0", //
								"MSXML2.XSLTemplate.3.0", "MSXML2.XSLTemplate"];
	
	//Try each object signature to get lastest object revision
  	for(var i=0; i < msTemplateSignatures.length; i++)
  	{
    	try {
    		var template = new ActiveXObject(msTemplateSignatures[i]);
    		return template;
    	} catch (oError) {
    		
    	}
    }
    window.alert("Couldn't create XSL Template.");
    return null;
}

/*
 * Use IE's ActiveX objects to transform the xmldoc.
 */

XMLUtilities.pProcessIEXSL = function(xmlDoc, xslDoc, parameters)
{
	var template = this.pCreateIEXSLTemplate();
	if(template == null)
	{
		window.alert("XSL Template not loaded successfully");
		//error
		return;
	}
	template.stylesheet = xslDoc;
	
	var processor = template.createProcessor();
	processor.input = xmlDoc;
	
	if(parameters != null)
	{
		for(var key in parameters)
		{
			processor.addParameter(key, parameters[key]);
		}
	}

	processor.transform();
	
	var result = processor.output;
	
	return result;
}

/*
 * Use Mozilla's built in objects to transform the xmldoc.
 */

XMLUtilities.pProcessMozillaXSL = function(xmlDoc, xslDoc, parameters)
{
	var processor = new XSLTProcessor();
	processor.importStylesheet(xslDoc);
	
	if(parameters != null)
	{
		for(var key in parameters)
		{
			processor.setParameter(null, key, parameters[key]);
		}
	}
	
	var resultDOM = processor.transformToDocument(xmlDoc);
	
	var oSerializer = new XMLSerializer();
	var result = oSerializer.serializeToString(resultDOM, "text/xml");
	
	return result;
}
/**
 * @param {XMLDoc}
 * @return {String}
 */
XMLUtilities.getXMLString = function (xml){
  if (xml.xml) {
    return xml.xml;
  } else if(xml.innerXML) {
    return xml.innerXML;  
  } else if(xml.innerText) {
    var regExp = new RegExp('- <', 'g');
    var xmlString = xml.innerText;
    xmlString = xmlString.replace(/^\s+/,"").replace(regExp,'<'); 
    var xmlStrArr = xmlString.split("\n");
    xmlString = "";
    var retStr = "";
    for (var i=0; i<xmlStrArr.length; i++) {
      var currLine = xmlStrArr[i];
      var start = currLine.indexOf('>');
      var end = currLine.lastIndexOf('</');
      var len = currLine.length;
      if (currLine.indexOf("<![CDATA") != -1) {  // <![[CDATA
        while(currLine.indexOf("]]>") == -1) {
         retStr += currLine;
         i++;
         currLine = xmlStrArr[i];
        }
        retStr += currLine;
      } else if ((end == -1) && (currLine.charAt(0) == '<')) {  // <tag> or <note
        retStr += currLine; 
      } else if (end == 2) {   // </tag>
        retStr += currLine;
      } else if ((start != -1) && (end != -1)) {  // <tag> value </tag>
        var lnstart = currLine.substring(0,start+1);
        var lnend = currLine.substring(end, currLine.length);
        var mid = currLine.substring(start+1,end);
        retStr = retStr + lnstart + mid.replace('&','&amp;').replace('<','&lt;') + lnend;		  
      } else {
        retStr += currLine;
      }
   }
   return retStr;
  } else if (typeof XMLSerializer != 'undefined') {
    var serializer = new XMLSerializer();
    return serializer.serializeToString(xml);
  }
  window.alert("XML.serialize is not supported or can't serialize"+xml);
  return null;
}
})();


(function(){
xdo.bind("xdo.lang.StringBuffer", StringBuffer);
xdo.require("xdo.Browser");
/**
 * A string buffer implements a mutable sequence of characters.
 * @class String Buffer class
 */
function StringBuffer()
{
  if (xdo.Browser.isMozilla())
  {
    this._useString = true;
    this._data = "";
  }
  else
  {
    this._useString = false;
    this._data = new Array;
  }
}

/**
 * appends objects to the string buffer
 *
 * @param {Object} dat an object to append
 */
StringBuffer.prototype.append = function(dat)
{
  if (this._useString)
  {
    this._data += dat;
  }
  else
  {
    this._data.push(dat);
  }
}

/**
 * appends objects to the string buffer
 *
 * @param {String} format printf like format string 
 * (but currently only %s and plain %d (no decimal point or number formatting) is supported)
 * @param {String[]} string array to complete formatting
 */
StringBuffer.prototype.appendWithFormat = function(format, parts)
{
  // loop
  var formatLen = format.length;
  var chunk = '';
  var partsLength = (parts == null || parts.constructor != Array)?0:parts.length;
  var partsIdx = 0;
  var ch;
  
  for (var i=0; i<formatLen; i++)
  {
    ch = format.charAt(i);

    // escape
    if (ch == '%')
    {
      // check next character
      i++;
      ch = format.charAt(i);
      switch (ch)
      {
      case 's':
      case 'd':
        // put current chunk
        if (partsIdx < partsLength) 
        {
          this.append(chunk);
          chunk = '';
          this.append(parts[partsIdx]);
          partsIdx++;
        }
        break;
        
      case '%':
        chunk += ch;
        break;
      }
    }
    else
    {
      chunk += ch;
    }
  }
  if (chunk.length > 0) this.append(chunk);
  
}

 
/**
 * Converts to a string representing the data in this string buffer.
 *
 * @return {String} a string representation of the string buffer
 */
StringBuffer.prototype.toString = function()
{
  if (this._useString)
  {
    return this._data;
  }
  else
  {
    return this._data.join("");
  }
}

StringBuffer.prototype.reset = function()
{
  if (this._useString)
  {
    this._data = "";
  }
  else
  {
    this._data = [];
  }  
}

})();


(function(){
xdo.bind("xdo.util.Encoder", Encoder);
xdo.require("xdo.lang.StringBuffer");

/**
 * Escape string based on the information at 
 * http://www.owasp.org/index.php/XSS_(Cross_Site_Scripting)_Prevention_Cheat_Sheet
 * 
 * @constructor
 */
function Encoder()
{
  
}

Encoder.IMMUNE_HTML = [ ',', '.', '-', '_', ' ' ];
Encoder.IMMUNE_HTMLATTR = [ ',', '.', '-', '_' ];
Encoder.IMMUNE_CSS = [];
Encoder.IMMUNE_JAVASCRIPT = [ ',', '.', '_' ];
Encoder.IMMUNE_VBSCRIPT = [ ',', '.', '_' ];
Encoder.IMMUNE_XML = [ ',', '.', '-', '_', ' ' ];
Encoder.IMMUNE_SQL = [ ' ' ];
Encoder.IMMUNE_OS = [ '-' ];
Encoder.IMMUNE_XMLATTR = [ ',', '.', '-', '_' ];
Encoder.IMMUNE_XPATH = [ ',', '.', '-', '_', ' ' ];


Encoder.hex = new Array(256);

(function() {
  for ( var c = 0; c < 0xFF; c++ ) {
    if ( c >= 0x30 && c <= 0x39 || c >= 0x41 && c <= 0x5A || c >= 0x61 && c <= 0x7A ) {
      Encoder.hex[c] = null;
    } else {
      Encoder.hex[c] = c.toString(16);
    }
  }
})();


/**
 * encode string for HTML attribute
 * 
 * @param input {String} raw string
 * @return {String} encoded string
 */
Encoder.encodeForHTMLAttribute = function (input)
{
  if( input == null ) {
    return null;
  }

  input = (typeof(input) != "string")?input.toString():input;
  
  var sb = new xdo.lang.StringBuffer();
  for (var i = 0; i < input.length; i++) {
      var c = input.charAt(i);
      sb.append(Encoder._encodeHTMLCharacter(Encoder.IMMUNE_HTMLATTR, c));
  }
  return sb.toString();  
}

/**
 * @param {String} input input string
 */
Encoder.encodeForHTML = function (input)
{
  if( input == null ) {
    return null;
  }

  input = (typeof(input) != "string")?input.toString():input;
  
  var sb = new xdo.lang.StringBuffer();
  for (var i = 0; i < input.length; i++) {
      var c = input.charAt(i);
      sb.append(Encoder._encodeHTMLCharacter(Encoder.IMMUNE_HTML, c));
  }
  return sb.toString();
}

Encoder.encodeForXML = function (input)
{
  if( input == null ) {
    return null;
  }

  input = (typeof(input) != "string")?input.toString():input;
  
  var sb = new xdo.lang.StringBuffer();
  for (var i = 0; i < input.length; i++) {
      var c = input.charAt(i);
      sb.append(Encoder._encodeHTMLCharacter(Encoder.IMMUNE_XML, c));
  }
  return sb.toString();
}

Encoder.encodeForXMLAttribute = function(input)
{
  if( input == null ) {
    return null;
  }

  input = (typeof(input) != "string")?input.toString():input;
  
  var sb = new xdo.lang.StringBuffer();
  for (var i = 0; i < input.length; i++) {
      var c = input.charAt(i);
      sb.append(Encoder._encodeHTMLCharacter(Encoder.IMMUNE_XMLATTR, c));
  }
  return sb.toString();    
}

/**
 * encode string for css
 * @param {String} input input string
 */
Encoder.encodeForCSS = function(input)
{
  if( input == null ) {
    return null;
  }
  
  input = (typeof(input) != "string")?input.toString():input;
  
  var sb = new xdo.lang.StringBuffer();
  for (var i = 0; i < input.length; i++) {
      var c = input.charAt(i);
      sb.append(  Encoder._encodeCSSCharacter(Encoder.IMMUNE_CSS, c));
  }
  
  return sb.toString();  
}

/**
 * encode string for javascript
 * @param {String} input input string
 */
Encoder.encodeForJavaScript= function(input)
{
  if( input == null ) {
    return null;
  }
  
  input = (typeof(input) != "string")?input.toString():input;
  var sb = new xdo.lang.StringBuffer();
  for (var i = 0; i < input.length; i++) {
      var c = input.charAt(i);
      sb.append(Encoder._encodeJSCharacter(Encoder.IMMUNE_JAVASCRIPT, c));
  }
  
  return sb.toString();  
}


/**
 * utility function to check given character is in the array or not
 * 
 * @private
 */
Encoder._containsCharacter = function( c, array ) {
  for (var i = 0; i < array.length; i++) {
    if (c == array[i].charCodeAt(0)) return true;
  }
  return false;
}

/**
 * @private
 */
Encoder._getHexForNonAlphanumeric = function( c ) {
  if ( c > 0xFF ) return null;
  return Encoder.hex[c];
}



/*
 * -------------------------------------------------------------------------------------------------------
 * HTMLCodec
 * -------------------------------------------------------------------------------------------------------
 */
Encoder.characterToEntityMap = {};
Encoder.entityToCharacterMap = {};

(function() {
  var entityNames = [ "quot"
  /* 34 : quotation mark */, "amp"
  /* 38 : ampersand */, "lt"
  /* 60 : less-than sign */, "gt"
  /* 62 : greater-than sign */, "nbsp"
  /* 160 : no-break space */, "iexcl"
  /* 161 : inverted exclamation mark */, "cent"
  /* 162 : cent sign */, "pound"
  /* 163 : pound sign */, "curren"
  /* 164 : currency sign */, "yen"
  /* 165 : yen sign */, "brvbar"
  /* 166 : broken bar */, "sect"
  /* 167 : section sign */, "uml"
  /* 168 : diaeresis */, "copy"
  /* 169 : copyright sign */, "ordf"
  /* 170 : feminine ordinal indicator */, "laquo"
  /* 171 : left-pointing double angle quotation mark */, "not"
  /* 172 : not sign */, "shy"
  /* 173 : soft hyphen */, "reg"
  /* 174 : registered sign */, "macr"
  /* 175 : macron */, "deg"
  /* 176 : degree sign */, "plusmn"
  /* 177 : plus-minus sign */, "sup2"
  /* 178 : superscript two */, "sup3"
  /* 179 : superscript three */, "acute"
  /* 180 : acute accent */, "micro"
  /* 181 : micro sign */, "para"
  /* 182 : pilcrow sign */, "middot"
  /* 183 : middle dot */, "cedil"
  /* 184 : cedilla */, "sup1"
  /* 185 : superscript one */, "ordm"
  /* 186 : masculine ordinal indicator */, "raquo"
  /* 187 : right-pointing double angle quotation mark */, "frac14"
  /* 188 : vulgar fraction one quarter */, "frac12"
  /* 189 : vulgar fraction one half */, "frac34"
  /* 190 : vulgar fraction three quarters */, "iquest"
  /* 191 : inverted question mark */, "Agrave"
  /* 192 : Latin capital letter a with grave */, "Aacute"
  /* 193 : Latin capital letter a with acute */, "Acirc"
  /* 194 : Latin capital letter a with circumflex */, "Atilde"
  /* 195 : Latin capital letter a with tilde */, "Auml"
  /* 196 : Latin capital letter a with diaeresis */, "Aring"
  /* 197 : Latin capital letter a with ring above */, "AElig"
  /* 198 : Latin capital letter ae */, "Ccedil"
  /* 199 : Latin capital letter c with cedilla */, "Egrave"
  /* 200 : Latin capital letter e with grave */, "Eacute"
  /* 201 : Latin capital letter e with acute */, "Ecirc"
  /* 202 : Latin capital letter e with circumflex */, "Euml"
  /* 203 : Latin capital letter e with diaeresis */, "Igrave"
  /* 204 : Latin capital letter i with grave */, "Iacute"
  /* 205 : Latin capital letter i with acute */, "Icirc"
  /* 206 : Latin capital letter i with circumflex */, "Iuml"
  /* 207 : Latin capital letter i with diaeresis */, "ETH"
  /* 208 : Latin capital letter eth */, "Ntilde"
  /* 209 : Latin capital letter n with tilde */, "Ograve"
  /* 210 : Latin capital letter o with grave */, "Oacute"
  /* 211 : Latin capital letter o with acute */, "Ocirc"
  /* 212 : Latin capital letter o with circumflex */, "Otilde"
  /* 213 : Latin capital letter o with tilde */, "Ouml"
  /* 214 : Latin capital letter o with diaeresis */, "times"
  /* 215 : multiplication sign */, "Oslash"
  /* 216 : Latin capital letter o with stroke */, "Ugrave"
  /* 217 : Latin capital letter u with grave */, "Uacute"
  /* 218 : Latin capital letter u with acute */, "Ucirc"
  /* 219 : Latin capital letter u with circumflex */, "Uuml"
  /* 220 : Latin capital letter u with diaeresis */, "Yacute"
  /* 221 : Latin capital letter y with acute */, "THORN"
  /* 222 : Latin capital letter thorn */, "szlig"
  /* 223 : Latin small letter sharp s, German Eszett */, "agrave"
  /* 224 : Latin small letter a with grave */, "aacute"
  /* 225 : Latin small letter a with acute */, "acirc"
  /* 226 : Latin small letter a with circumflex */, "atilde"
  /* 227 : Latin small letter a with tilde */, "auml"
  /* 228 : Latin small letter a with diaeresis */, "aring"
  /* 229 : Latin small letter a with ring above */, "aelig"
  /* 230 : Latin lowercase ligature ae */, "ccedil"
  /* 231 : Latin small letter c with cedilla */, "egrave"
  /* 232 : Latin small letter e with grave */, "eacute"
  /* 233 : Latin small letter e with acute */, "ecirc"
  /* 234 : Latin small letter e with circumflex */, "euml"
  /* 235 : Latin small letter e with diaeresis */, "igrave"
  /* 236 : Latin small letter i with grave */, "iacute"
  /* 237 : Latin small letter i with acute */, "icirc"
  /* 238 : Latin small letter i with circumflex */, "iuml"
  /* 239 : Latin small letter i with diaeresis */, "eth"
  /* 240 : Latin small letter eth */, "ntilde"
  /* 241 : Latin small letter n with tilde */, "ograve"
  /* 242 : Latin small letter o with grave */, "oacute"
  /* 243 : Latin small letter o with acute */, "ocirc"
  /* 244 : Latin small letter o with circumflex */, "otilde"
  /* 245 : Latin small letter o with tilde */, "ouml"
  /* 246 : Latin small letter o with diaeresis */, "divide"
  /* 247 : division sign */, "oslash"
  /* 248 : Latin small letter o with stroke */, "ugrave"
  /* 249 : Latin small letter u with grave */, "uacute"
  /* 250 : Latin small letter u with acute */, "ucirc"
  /* 251 : Latin small letter u with circumflex */, "uuml"
  /* 252 : Latin small letter u with diaeresis */, "yacute"
  /* 253 : Latin small letter y with acute */, "thorn"
  /* 254 : Latin small letter thorn */, "yuml"
  /* 255 : Latin small letter y with diaeresis */, "OElig"
  /* 338 : Latin capital ligature oe */, "oelig"
  /* 339 : Latin small ligature oe */, "Scaron"
  /* 352 : Latin capital letter s with caron */, "scaron"
  /* 353 : Latin small letter s with caron */, "Yuml"
  /* 376 : Latin capital letter y with diaeresis */, "fnof"
  /* 402 : Latin small letter f with hook */, "circ"
  /* 710 : modifier letter circumflex accent */, "tilde"
  /* 732 : small tilde */, "Alpha"
  /* 913 : Greek capital letter alpha */, "Beta"
  /* 914 : Greek capital letter beta */, "Gamma"
  /* 915 : Greek capital letter gamma */, "Delta"
  /* 916 : Greek capital letter delta */, "Epsilon"
  /* 917 : Greek capital letter epsilon */, "Zeta"
  /* 918 : Greek capital letter zeta */, "Eta"
  /* 919 : Greek capital letter eta */, "Theta"
  /* 920 : Greek capital letter theta */, "Iota"
  /* 921 : Greek capital letter iota */, "Kappa"
  /* 922 : Greek capital letter kappa */, "Lambda"
  /* 923 : Greek capital letter lambda */, "Mu"
  /* 924 : Greek capital letter mu */, "Nu"
  /* 925 : Greek capital letter nu */, "Xi"
  /* 926 : Greek capital letter xi */, "Omicron"
  /* 927 : Greek capital letter omicron */, "Pi"
  /* 928 : Greek capital letter pi */, "Rho"
  /* 929 : Greek capital letter rho */, "Sigma"
  /* 931 : Greek capital letter sigma */, "Tau"
  /* 932 : Greek capital letter tau */, "Upsilon"
  /* 933 : Greek capital letter upsilon */, "Phi"
  /* 934 : Greek capital letter phi */, "Chi"
  /* 935 : Greek capital letter chi */, "Psi"
  /* 936 : Greek capital letter psi */, "Omega"
  /* 937 : Greek capital letter omega */, "alpha"
  /* 945 : Greek small letter alpha */, "beta"
  /* 946 : Greek small letter beta */, "gamma"
  /* 947 : Greek small letter gamma */, "delta"
  /* 948 : Greek small letter delta */, "epsilon"
  /* 949 : Greek small letter epsilon */, "zeta"
  /* 950 : Greek small letter zeta */, "eta"
  /* 951 : Greek small letter eta */, "theta"
  /* 952 : Greek small letter theta */, "iota"
  /* 953 : Greek small letter iota */, "kappa"
  /* 954 : Greek small letter kappa */, "lambda"
  /* 955 : Greek small letter lambda */, "mu"
  /* 956 : Greek small letter mu */, "nu"
  /* 957 : Greek small letter nu */, "xi"
  /* 958 : Greek small letter xi */, "omicron"
  /* 959 : Greek small letter omicron */, "pi"
  /* 960 : Greek small letter pi */, "rho"
  /* 961 : Greek small letter rho */, "sigmaf"
  /* 962 : Greek small letter final sigma */, "sigma"
  /* 963 : Greek small letter sigma */, "tau"
  /* 964 : Greek small letter tau */, "upsilon"
  /* 965 : Greek small letter upsilon */, "phi"
  /* 966 : Greek small letter phi */, "chi"
  /* 967 : Greek small letter chi */, "psi"
  /* 968 : Greek small letter psi */, "omega"
  /* 969 : Greek small letter omega */, "thetasym"
  /* 977 : Greek theta symbol */, "upsih"
  /* 978 : Greek upsilon with hook symbol */, "piv"
  /* 982 : Greek pi symbol */, "ensp"
  /* 8194 : en space */, "emsp"
  /* 8195 : em space */, "thinsp"
  /* 8201 : thin space */, "zwnj"
  /* 8204 : zero width non-joiner */, "zwj"
  /* 8205 : zero width joiner */, "lrm"
  /* 8206 : left-to-right mark */, "rlm"
  /* 8207 : right-to-left mark */, "ndash"
  /* 8211 : en dash */, "mdash"
  /* 8212 : em dash */, "lsquo"
  /* 8216 : left single quotation mark */, "rsquo"
  /* 8217 : right single quotation mark */, "sbquo"
  /* 8218 : single low-9 quotation mark */, "ldquo"
  /* 8220 : left double quotation mark */, "rdquo"
  /* 8221 : right double quotation mark */, "bdquo"
  /* 8222 : double low-9 quotation mark */, "dagger"
  /* 8224 : dagger */, "Dagger"
  /* 8225 : double dagger */, "bull"
  /* 8226 : bullet */, "hellip"
  /* 8230 : horizontal ellipsis */, "permil"
  /* 8240 : per mille sign */, "prime"
  /* 8242 : prime */, "Prime"
  /* 8243 : double prime */, "lsaquo"
  /* 8249 : single left-pointing angle quotation mark */, "rsaquo"
  /* 8250 : single right-pointing angle quotation mark */, "oline"
  /* 8254 : overline */, "frasl"
  /* 8260 : fraction slash */, "euro"
  /* 8364 : euro sign */, "image"
  /* 8465 : black-letter capital i */, "weierp"
  /* 8472 : script capital p, Weierstrass p */, "real"
  /* 8476 : black-letter capital r */, "trade"
  /* 8482 : trademark sign */, "alefsym"
  /* 8501 : alef symbol */, "larr"
  /* 8592 : leftwards arrow */, "uarr"
  /* 8593 : upwards arrow */, "rarr"
  /* 8594 : rightwards arrow */, "darr"
  /* 8595 : downwards arrow */, "harr"
  /* 8596 : left right arrow */, "crarr"
  /* 8629 : downwards arrow with corner leftwards */, "lArr"
  /* 8656 : leftwards double arrow */, "uArr"
  /* 8657 : upwards double arrow */, "rArr"
  /* 8658 : rightwards double arrow */, "dArr"
  /* 8659 : downwards double arrow */, "hArr"
  /* 8660 : left right double arrow */, "forall"
  /* 8704 : for all */, "part"
  /* 8706 : partial differential */, "exist"
  /* 8707 : there exists */, "empty"
  /* 8709 : empty set */, "nabla"
  /* 8711 : nabla */, "isin"
  /* 8712 : element of */, "notin"
  /* 8713 : not an element of */, "ni"
  /* 8715 : contains as member */, "prod"
  /* 8719 : n-ary product */, "sum"
  /* 8721 : n-ary summation */, "minus"
  /* 8722 : minus sign */, "lowast"
  /* 8727 : asterisk operator */, "radic"
  /* 8730 : square root */, "prop"
  /* 8733 : proportional to */, "infin"
  /* 8734 : infinity */, "ang"
  /* 8736 : angle */, "and"
  /* 8743 : logical and */, "or"
  /* 8744 : logical or */, "cap"
  /* 8745 : intersection */, "cup"
  /* 8746 : union */, "int"
  /* 8747 : integral */, "there4"
  /* 8756 : therefore */, "sim"
  /* 8764 : tilde operator */, "cong"
  /* 8773 : congruent to */, "asymp"
  /* 8776 : almost equal to */, "ne"
  /* 8800 : not equal to */, "equiv"
  /* 8801 : identical to, equivalent to */, "le"
  /* 8804 : less-than or equal to */, "ge"
  /* 8805 : greater-than or equal to */, "sub"
  /* 8834 : subset of */, "sup"
  /* 8835 : superset of */, "nsub"
  /* 8836 : not a subset of */, "sube"
  /* 8838 : subset of or equal to */, "supe"
  /* 8839 : superset of or equal to */, "oplus"
  /* 8853 : circled plus */, "otimes"
  /* 8855 : circled times */, "perp"
  /* 8869 : up tack */, "sdot"
  /* 8901 : dot operator */, "lceil"
  /* 8968 : left ceiling */, "rceil"
  /* 8969 : right ceiling */, "lfloor"
  /* 8970 : left floor */, "rfloor"
  /* 8971 : right floor */, "lang"
  /* 9001 : left-pointing angle bracket */, "rang"
  /* 9002 : right-pointing angle bracket */, "loz"
  /* 9674 : lozenge */, "spades"
  /* 9824 : black spade suit */, "clubs"
  /* 9827 : black club suit */, "hearts"
  /* 9829 : black heart suit */, "diams"
  /* 9830 : black diamond suit */ ];

  var entityValues = [ 34
  /* &quot; : quotation mark */, 38
  /* &amp; : ampersand */, 60
  /* &lt; : less-than sign */, 62
  /* &gt; : greater-than sign */, 160
  /* &nbsp; : no-break space */, 161
  /* &iexcl; : inverted exclamation mark */, 162
  /* &cent; : cent sign */, 163
  /* &pound; : pound sign */, 164
  /* &curren; : currency sign */, 165
  /* &yen; : yen sign */, 166
  /* &brvbar; : broken bar */, 167
  /* &sect; : section sign */, 168
  /* &uml; : diaeresis */, 169
  /* &copy; : copyright sign */, 170
  /* &ordf; : feminine ordinal indicator */, 171
  /* &laquo; : left-pointing double angle quotation mark */, 172
  /* &not; : not sign */, 173
  /* &shy; : soft hyphen */, 174
  /* &reg; : registered sign */, 175
  /* &macr; : macron */, 176
  /* &deg; : degree sign */, 177
  /* &plusmn; : plus-minus sign */, 178
  /* &sup2; : superscript two */, 179
  /* &sup3; : superscript three */, 180
  /* &acute; : acute accent */, 181
  /* &micro; : micro sign */, 182
  /* &para; : pilcrow sign */, 183
  /* &middot; : middle dot */, 184
  /* &cedil; : cedilla */, 185
  /* &sup1; : superscript one */, 186
  /* &ordm; : masculine ordinal indicator */, 187
  /* &raquo; : right-pointing double angle quotation mark */, 188
  /* &frac14; : vulgar fraction one quarter */, 189
  /* &frac12; : vulgar fraction one half */, 190
  /* &frac34; : vulgar fraction three quarters */, 191
  /* &iquest; : inverted question mark */, 192
  /* &Agrave; : Latin capital letter a with grave */, 193
  /* &Aacute; : Latin capital letter a with acute */, 194
  /* &Acirc; : Latin capital letter a with circumflex */, 195
  /* &Atilde; : Latin capital letter a with tilde */, 196
  /* &Auml; : Latin capital letter a with diaeresis */, 197
  /* &Aring; : Latin capital letter a with ring above */, 198
  /* &AElig; : Latin capital letter ae */, 199
  /* &Ccedil; : Latin capital letter c with cedilla */, 200
  /* &Egrave; : Latin capital letter e with grave */, 201
  /* &Eacute; : Latin capital letter e with acute */, 202
  /* &Ecirc; : Latin capital letter e with circumflex */, 203
  /* &Euml; : Latin capital letter e with diaeresis */, 204
  /* &Igrave; : Latin capital letter i with grave */, 205
  /* &Iacute; : Latin capital letter i with acute */, 206
  /* &Icirc; : Latin capital letter i with circumflex */, 207
  /* &Iuml; : Latin capital letter i with diaeresis */, 208
  /* &ETH; : Latin capital letter eth */, 209
  /* &Ntilde; : Latin capital letter n with tilde */, 210
  /* &Ograve; : Latin capital letter o with grave */, 211
  /* &Oacute; : Latin capital letter o with acute */, 212
  /* &Ocirc; : Latin capital letter o with circumflex */, 213
  /* &Otilde; : Latin capital letter o with tilde */, 214
  /* &Ouml; : Latin capital letter o with diaeresis */, 215
  /* &times; : multiplication sign */, 216
  /* &Oslash; : Latin capital letter o with stroke */, 217
  /* &Ugrave; : Latin capital letter u with grave */, 218
  /* &Uacute; : Latin capital letter u with acute */, 219
  /* &Ucirc; : Latin capital letter u with circumflex */, 220
  /* &Uuml; : Latin capital letter u with diaeresis */, 221
  /* &Yacute; : Latin capital letter y with acute */, 222
  /* &THORN; : Latin capital letter thorn */, 223
  /* &szlig; : Latin small letter sharp s, German Eszett */, 224
  /* &agrave; : Latin small letter a with grave */, 225
  /* &aacute; : Latin small letter a with acute */, 226
  /* &acirc; : Latin small letter a with circumflex */, 227
  /* &atilde; : Latin small letter a with tilde */, 228
  /* &auml; : Latin small letter a with diaeresis */, 229
  /* &aring; : Latin small letter a with ring above */, 230
  /* &aelig; : Latin lowercase ligature ae */, 231
  /* &ccedil; : Latin small letter c with cedilla */, 232
  /* &egrave; : Latin small letter e with grave */, 233
  /* &eacute; : Latin small letter e with acute */, 234
  /* &ecirc; : Latin small letter e with circumflex */, 235
  /* &euml; : Latin small letter e with diaeresis */, 236
  /* &igrave; : Latin small letter i with grave */, 237
  /* &iacute; : Latin small letter i with acute */, 238
  /* &icirc; : Latin small letter i with circumflex */, 239
  /* &iuml; : Latin small letter i with diaeresis */, 240
  /* &eth; : Latin small letter eth */, 241
  /* &ntilde; : Latin small letter n with tilde */, 242
  /* &ograve; : Latin small letter o with grave */, 243
  /* &oacute; : Latin small letter o with acute */, 244
  /* &ocirc; : Latin small letter o with circumflex */, 245
  /* &otilde; : Latin small letter o with tilde */, 246
  /* &ouml; : Latin small letter o with diaeresis */, 247
  /* &divide; : division sign */, 248
  /* &oslash; : Latin small letter o with stroke */, 249
  /* &ugrave; : Latin small letter u with grave */, 250
  /* &uacute; : Latin small letter u with acute */, 251
  /* &ucirc; : Latin small letter u with circumflex */, 252
  /* &uuml; : Latin small letter u with diaeresis */, 253
  /* &yacute; : Latin small letter y with acute */, 254
  /* &thorn; : Latin small letter thorn */, 255
  /* &yuml; : Latin small letter y with diaeresis */, 338
  /* &OElig; : Latin capital ligature oe */, 339
  /* &oelig; : Latin small ligature oe */, 352
  /* &Scaron; : Latin capital letter s with caron */, 353
  /* &scaron; : Latin small letter s with caron */, 376
  /* &Yuml; : Latin capital letter y with diaeresis */, 402
  /* &fnof; : Latin small letter f with hook */, 710
  /* &circ; : modifier letter circumflex accent */, 732
  /* &tilde; : small tilde */, 913
  /* &Alpha; : Greek capital letter alpha */, 914
  /* &Beta; : Greek capital letter beta */, 915
  /* &Gamma; : Greek capital letter gamma */, 916
  /* &Delta; : Greek capital letter delta */, 917
  /* &Epsilon; : Greek capital letter epsilon */, 918
  /* &Zeta; : Greek capital letter zeta */, 919
  /* &Eta; : Greek capital letter eta */, 920
  /* &Theta; : Greek capital letter theta */, 921
  /* &Iota; : Greek capital letter iota */, 922
  /* &Kappa; : Greek capital letter kappa */, 923
  /* &Lambda; : Greek capital letter lambda */, 924
  /* &Mu; : Greek capital letter mu */, 925
  /* &Nu; : Greek capital letter nu */, 926
  /* &Xi; : Greek capital letter xi */, 927
  /* &Omicron; : Greek capital letter omicron */, 928
  /* &Pi; : Greek capital letter pi */, 929
  /* &Rho; : Greek capital letter rho */, 931
  /* &Sigma; : Greek capital letter sigma */, 932
  /* &Tau; : Greek capital letter tau */, 933
  /* &Upsilon; : Greek capital letter upsilon */, 934
  /* &Phi; : Greek capital letter phi */, 935
  /* &Chi; : Greek capital letter chi */, 936
  /* &Psi; : Greek capital letter psi */, 937
  /* &Omega; : Greek capital letter omega */, 945
  /* &alpha; : Greek small letter alpha */, 946
  /* &beta; : Greek small letter beta */, 947
  /* &gamma; : Greek small letter gamma */, 948
  /* &delta; : Greek small letter delta */, 949
  /* &epsilon; : Greek small letter epsilon */, 950
  /* &zeta; : Greek small letter zeta */, 951
  /* &eta; : Greek small letter eta */, 952
  /* &theta; : Greek small letter theta */, 953
  /* &iota; : Greek small letter iota */, 954
  /* &kappa; : Greek small letter kappa */, 955
  /* &lambda; : Greek small letter lambda */, 956
  /* &mu; : Greek small letter mu */, 957
  /* &nu; : Greek small letter nu */, 958
  /* &xi; : Greek small letter xi */, 959
  /* &omicron; : Greek small letter omicron */, 960
  /* &pi; : Greek small letter pi */, 961
  /* &rho; : Greek small letter rho */, 962
  /* &sigmaf; : Greek small letter final sigma */, 963
  /* &sigma; : Greek small letter sigma */, 964
  /* &tau; : Greek small letter tau */, 965
  /* &upsilon; : Greek small letter upsilon */, 966
  /* &phi; : Greek small letter phi */, 967
  /* &chi; : Greek small letter chi */, 968
  /* &psi; : Greek small letter psi */, 969
  /* &omega; : Greek small letter omega */, 977
  /* &thetasym; : Greek theta symbol */, 978
  /* &upsih; : Greek upsilon with hook symbol */, 982
  /* &piv; : Greek pi symbol */, 8194
  /* &ensp; : en space */, 8195
  /* &emsp; : em space */, 8201
  /* &thinsp; : thin space */, 8204
  /* &zwnj; : zero width non-joiner */, 8205
  /* &zwj; : zero width joiner */, 8206
  /* &lrm; : left-to-right mark */, 8207
  /* &rlm; : right-to-left mark */, 8211
  /* &ndash; : en dash */, 8212
  /* &mdash; : em dash */, 8216
  /* &lsquo; : left single quotation mark */, 8217
  /* &rsquo; : right single quotation mark */, 8218
  /* &sbquo; : single low-9 quotation mark */, 8220
  /* &ldquo; : left double quotation mark */, 8221
  /* &rdquo; : right double quotation mark */, 8222
  /* &bdquo; : double low-9 quotation mark */, 8224
  /* &dagger; : dagger */, 8225
  /* &Dagger; : double dagger */, 8226
  /* &bull; : bullet */, 8230
  /* &hellip; : horizontal ellipsis */, 8240
  /* &permil; : per mille sign */, 8242
  /* &prime; : prime */, 8243
  /* &Prime; : double prime */, 8249
  /* &lsaquo; : single left-pointing angle quotation mark */, 8250
  /* &rsaquo; : single right-pointing angle quotation mark */, 8254
  /* &oline; : overline */, 8260
  /* &frasl; : fraction slash */, 8364
  /* &euro; : euro sign */, 8465
  /* &image; : black-letter capital i */, 8472
  /* &weierp; : script capital p, Weierstrass p */, 8476
  /* &real; : black-letter capital r */, 8482
  /* &trade; : trademark sign */, 8501
  /* &alefsym; : alef symbol */, 8592
  /* &larr; : leftwards arrow */, 8593
  /* &uarr; : upwards arrow */, 8594
  /* &rarr; : rightwards arrow */, 8595
  /* &darr; : downwards arrow */, 8596
  /* &harr; : left right arrow */, 8629
  /* &crarr; : downwards arrow with corner leftwards */, 8656
  /* &lArr; : leftwards double arrow */, 8657
  /* &uArr; : upwards double arrow */, 8658
  /* &rArr; : rightwards double arrow */, 8659
  /* &dArr; : downwards double arrow */, 8660
  /* &hArr; : left right double arrow */, 8704
  /* &forall; : for all */, 8706
  /* &part; : partial differential */, 8707
  /* &exist; : there exists */, 8709
  /* &empty; : empty set */, 8711
  /* &nabla; : nabla */, 8712
  /* &isin; : element of */, 8713
  /* &notin; : not an element of */, 8715
  /* &ni; : contains as member */, 8719
  /* &prod; : n-ary product */, 8721
  /* &sum; : n-ary summation */, 8722
  /* &minus; : minus sign */, 8727
  /* &lowast; : asterisk operator */, 8730
  /* &radic; : square root */, 8733
  /* &prop; : proportional to */, 8734
  /* &infin; : infinity */, 8736
  /* &ang; : angle */, 8743
  /* &and; : logical and */, 8744
  /* &or; : logical or */, 8745
  /* &cap; : intersection */, 8746
  /* &cup; : union */, 8747
  /* &int; : integral */, 8756
  /* &there4; : therefore */, 8764
  /* &sim; : tilde operator */, 8773
  /* &cong; : congruent to */, 8776
  /* &asymp; : almost equal to */, 8800
  /* &ne; : not equal to */, 8801
  /* &equiv; : identical to, equivalent to */, 8804
  /* &le; : less-than or equal to */, 8805
  /* &ge; : greater-than or equal to */, 8834
  /* &sub; : subset of */, 8835
  /* &sup; : superset of */, 8836
  /* &nsub; : not a subset of */, 8838
  /* &sube; : subset of or equal to */, 8839
  /* &supe; : superset of or equal to */, 8853
  /* &oplus; : circled plus */, 8855
  /* &otimes; : circled times */, 8869
  /* &perp; : up tack */, 8901
  /* &sdot; : dot operator */, 8968
  /* &lceil; : left ceiling */, 8969
  /* &rceil; : right ceiling */, 8970
  /* &lfloor; : left floor */, 8971
  /* &rfloor; : right floor */, 9001
  /* &lang; : left-pointing angle bracket */, 9002
  /* &rang; : right-pointing angle bracket */, 9674
  /* &loz; : lozenge */, 9824
  /* &spades; : black spade suit */, 9827
  /* &clubs; : black club suit */, 9829
  /* &hearts; : black heart suit */, 9830
  /* &diams; : black diamond suit */ ];
  
  
  for (var i = 0; i < entityNames.length; i++) {
    var e = entityNames[i];
    var c = entityValues[i];
    
    Encoder.entityToCharacterMap[e] = c;
    Encoder.characterToEntityMap[c] = e;
  }
})();


/**
 * encode character for HTML string
 * @param {String[]} immune immune character array
 * @param {String} c string (which has only character) to encoder 
 */
Encoder._encodeHTMLCharacter = function (immune, c)
{
  var ch = c.charCodeAt(0);
  
  // check for immune characters
  if ( Encoder._containsCharacter( ch, immune ) ) {
    return ""+c;
  }
  
  // check for alphanumeric characters
  var hex = Encoder._getHexForNonAlphanumeric( ch );
  if ( hex == null ) {
    return ""+c;
  }
  
  // check for illegal characters
  if ( ( ch <= 0x1f && c != '\t' && c != '\n' && c != '\r' ) || ( ch >= 0x7f && ch <= 0x9f ) ) {
    return( " " );
  }
  
  // check if there's a defined entity
  var entityName = Encoder.characterToEntityMap[ch];
  if (entityName != null) {
    return "&" + entityName + ";";
  }
  
  // return the hex entity as suggested in the spec
  return "&#x" + hex + ";";  
}

/* ---------------------------------------------------------------------------------------------------
 * JavaScript codec
 * ---------------------------------------------------------------------------------------------------
 */

/**
 * encode character for JavaScript string
 * @param {String[]} immune immune character array
 * @param {String} c string (which has only character) to encoder 
 */
Encoder._encodeJSCharacter = function(immune, c ) {
  var ch = c.charCodeAt(0);
  
  // check for immune characters
  if ( Encoder._containsCharacter( ch, immune ) ) {
    return ""+c;
  }
  
  // check for alphanumeric characters
  var hex = Encoder._getHexForNonAlphanumeric( ch );
  if ( hex == null ) {
    return ""+c;
  }
      
  // Do not use these shortcuts as they can be used to break out of a context
  // if ( ch == 0x00 ) return "\\0";
  // if ( ch == 0x08 ) return "\\b";
  // if ( ch == 0x09 ) return "\\t";
  // if ( ch == 0x0a ) return "\\n";
  // if ( ch == 0x0b ) return "\\v";
  // if ( ch == 0x0c ) return "\\f";
  // if ( ch == 0x0d ) return "\\r";
  // if ( ch == 0x22 ) return "\\\"";
  // if ( ch == 0x27 ) return "\\'";
  // if ( ch == 0x5c ) return "\\\\";

  // encode up to 256 with \\xHH
  hex = (ch).toString(16);
  if ( ch < 256 ) {
    var pad = "00".substring(hex.length );
    return "\\x" + pad + hex.toUpperCase();
  }

  // otherwise encode with \\uHHHH
  var pad = "0000".substring(hex.length );
  return "\\u" + pad + hex.toUpperCase();
}

/* ---------------------------------------------------------------------------------------------------
 * CSS codec
 * ---------------------------------------------------------------------------------------------------
 */
Encoder._encodeCSSCharacter = function(immune, c ) {
  var ch = c.charCodeAt(0);
   
  // check for immune characters
  if ( Encoder._containsCharacter( ch, immune ) ) {
    return ""+c;
  }
  
  // check for alphanumeric characters
  var hex = Encoder._getHexForNonAlphanumeric( ch );
  if ( hex == null ) {
    return ""+c;
  }  
  
  // return the hex and end in whitespace to terminate
  return "\\" + hex + " ";
}

})();


(function(){
xdo.bind("xdo.template.JSTemplate", JSTemplate);

xdo.require("xdo.lang.StringBuffer");
xdo.require("xdo.util.Encoder");

/**
 * 
 * @class JavaScript Template externalize VIEW part (i.e. HTML)
 * from JavaScript logic.  JSTemplate class provides the methods
 * to handle JavaScript with data (JavaScript object notation)
 * 
 */
function JSTemplate()
{
}


/**
 * Load JavaScript template from the server and returns processed
 * string with the provided data.
 *
 * @param {String} templatePath The path to the JavaScript Template.
 * @param {Object} objects JavaScript object which keeps the values for
 *  bind variables. Bind variables are defined with $ prefix in the
 *  JavaScript template.
 * @param {Boolean} removeSpaces flag to remove leading/trailing spaces, newline
 * characters from the text. (optional, default is false) 
 * @return {String} processed string
 */
JSTemplate.loadAndProcess = function (templatePath, objects, removeSpaces)
{
  var template = JSTemplate.include(templatePath);
  return JSTemplate.processTemplate(template, objects, removeSpaces);
}


/**
 * Load JavaScript template from the server and returns processed
 * string with the provided data.
 *
 * @param {String} templateString  JavaScript Template String
 * @param {Object} objects JavaScript object which keeps the values for
 *  bind variables. Bind variables are defined with $ prefix in the
 *  JavaScript template.
 * @param {Boolean} removeSpace flag to remove leading/trailing spaces, newline
 * characters from the text. (optional, default is false)
 * @return {String} processed string
 */
JSTemplate.processTemplate = function (templateString, objects, removeSpaces)
{
  var sbuf = new xdo.lang.StringBuffer();
  sbuf.append("{var Encoder = xdo.util.Encoder; var buf = new xdo.lang.StringBuffer();\n");
    
  var tempBuf = new xdo.lang.StringBuffer();
  var i=0;
  for (i=0; i<templateString.length-1; i++)
  {
    var ch = templateString.charAt(i); 
    if (ch == '<'
         && templateString.charAt(i+1) == '%')
    {
      var chunk = tempBuf.toString();
      
      if (removeSpaces)
      {
        chunk = chunk.replace(/^\s*/g,"").replace(/\s*$/g,"");
        chunk = chunk.replace(/\>\s+\</g, "><");
      }

      // escape and wrapped with double quote
      // new line chars might be in the middle of text.
      chunk = chunk.replace(/(\r\n|\n|\r)/g, "\\n");
      chunk = "buf.append(\""+chunk.replace(/\"/g,"\\\"")+"\");\n";
              
      sbuf.append(chunk);
      
      tempBuf.reset();
      i++;
    }
    else if (ch == '%'
         && templateString.charAt(i+1) == '>')
    {
      var chunk = tempBuf.toString();
            
      // check comment first
      if (chunk.charAt(0) != '-' && chunk.charAt(1) != '-') 
      {
        // bind variable
        // by replacing $ of $var with object. (to be objects.var)
        //
        // NOTE: need to use arguments implicit array variable to
        // access parameter because javascript compressor changes the
        // variable name.
        chunk = chunk.replace(/\$/g, "arguments[1].");
        if (chunk.charAt(0) == '=') 
        {
          chunk = chunk.replace(/;\s*$/, "");
          chunk = "buf.append(" + chunk.substr(1) + ");";
        }
        
        // load external template
        if (chunk.match(/xdo.template.JSTemplate.include/)) 
        {
          var template = eval(chunk);
          var text = JSTemplate.processTemplate(template, objects, removeSpaces);
          text = text.replace(/(\r\n|\n|\r)/g, "\\n");
          chunk = "buf.append(\"" + text.replace(/\"/g, "\\\"") + "\");";
        }
        
        chunk += "\n";
        
        sbuf.append(chunk);
      }
      
      tempBuf.reset();
      i++;
    }
    else
    {
      tempBuf.append(ch);
    }
  }
  
  // append last char to the tempBuf
  if (i == templateString.length-1)
  {
    tempBuf.append(templateString.charAt(i));
    
    // add last portion of the text
    var chunk = tempBuf.toString();
    
    if (removeSpaces)
    {
      chunk = chunk.replace(/^\s*/g,"").replace(/\s*$/g,"");
      chunk = chunk.replace(/\>\s+\</, "><");
    }
  
    // escape and wrapped with double quote
    // new line chars might be in the middle of text.
    chunk = chunk.replace(/(\r\n|\n|\r)/g, "\\n");
    chunk = "buf.append(\""+chunk.replace(/\"/g,"\\\"")+"\");\n";
            
    sbuf.append(chunk);
  }
 
  sbuf.append("buf.toString();\n")
  sbuf.append("}");
   
  return eval(sbuf.toString());
}

/**
 * include external template file. 
 * this 'xdo.template.JSTemplate.include()' call is handled.
 * @param {String} template file location
 * @return {String} template string, null if error occurred.
 */
JSTemplate.load = function (path)
{
  if (JSTemplate._templateCache[path])
     return JSTemplate._templateCache[path];

  xdo.require('xdo.io.Http');
  var url = xdo.mScriptRoot + '/' + path;
  var params =
  {
    cacheBuster: [xdo._version || '']
  }
  var template = xdo.io.Http.syncGet(url, params, false);

  JSTemplate._templateCache[path] = template;

  return template;
}

JSTemplate._templateCache = {};

/**
 * synonium as include
 */
JSTemplate.include = JSTemplate.load;
})();


(function(){
xdo.bind("xdo.i18n.DateFormatSymbols", DateFormatSymbols);

// This class behaves just like text formatting class in Java SDK.
// See JavaDoc API for usage.
// http://java.sun.com/javase/6/docs/api/java/text/DateFormatSymbols.html

function DateFormatSymbols()
{
  this.amPmStrings = [];
  this.eras = [];
  this.shortEras = [];
  this.localePatternChars = '';
  this.months = [];
  this.shortMonths = [];
  this.shortWeekdays = [''];
  this.weekdays = [''];
  this.zoneStrings = [[]];
}

DateFormatSymbols.prototype.getAmPmStrings = function()
{
  return this.amPmStrings;
}

DateFormatSymbols.prototype.setAmPmStrings = function(amPmStrings)
{
  this.amPmStrings = amPmStrings;
}

DateFormatSymbols.prototype.getEras = function()
{
  return this.eras;
}

DateFormatSymbols.prototype.setEras = function(eras)
{
  this.eras = eras;
}

DateFormatSymbols.prototype.getShortEras = function()
{
  return this.shortEras;
}

DateFormatSymbols.prototype.setShortEras = function(shortEras)
{
  this.shortEras = shortEras;
}

DateFormatSymbols.prototype.getLocalePatternChars = function()
{
  return this.localePatternChars;
}

DateFormatSymbols.prototype.setLocalePatternChars = function(localePatternChars)
{
  this.localePatternChars = localePatternChars;
}

DateFormatSymbols.prototype.getMonths = function()
{
  return this.months;
}

DateFormatSymbols.prototype.setMonths = function(months)
{
  this.months = months;
}

DateFormatSymbols.prototype.getShortMonths = function()
{
  return this.shortMonths;
}

DateFormatSymbols.prototype.setShortMonths = function(shortMonths)
{
  this.shortMonths = shortMonths;
}

DateFormatSymbols.prototype.getShortWeekdays = function()
{
  return this.shortWeekdays;
}

DateFormatSymbols.prototype.setShortWeekdays = function(shortWeekdays)
{
  this.shortWeekdays = shortWeekdays;
}

DateFormatSymbols.prototype.getWeekdays = function()
{
  return this.weekdays;
}

DateFormatSymbols.prototype.setWeekdays = function(weekdays)
{
  this.weekdays = weekdays;
}

DateFormatSymbols.prototype.getZoneStrings = function()
{
  return this.zoneStrings;
}

DateFormatSymbols.prototype.setZoneStrings = function(zoneStrings)
{
  this.zoneStrings = zoneStrings;
}

DateFormatSymbols.prototype.clone = function()
{
  function clone(obj)
  {
    var copy = null;
    if (obj.constructor.name == 'array')
    {
      copy = [];
      for (var i=0; i<arr.length; i++)
      {
        copy[i] = clone(arr[i]);
      }
    }
    else
      copy = obj;

    return copy;
  }
  
  var copy = new DateFormatSymbols();
  copy.setAmPmStrings( clone(this.getAmPmStrings()) );
  copy.setEras( clone(this.getEras()) );
  copy.setShortEras( clone(this.getShortEras()) );
  copy.setLocalePatternChars( clone(this.getLocalePatternChars()) );
  copy.setMonths( clone(this.getMonths()) );
  copy.setShortMonths( clone(this.getShortMonths()) );
  copy.setShortWeekdays( clone(this.getShortWeekdays()) );
  copy.setWeekdays( clone(this.getWeekdays()) );
  copy.setZoneStrings( clone(this.getZoneStrings()) );
  return copy;
}


DateFormatSymbols.definitions = {};

DateFormatSymbols.register = function(locale, symbols)
{
  var key = locale.toString();
  DateFormatSymbols.definitions[key] = symbols;
}

DateFormatSymbols.lookup = function(locale)
{
  var key = locale.toString();
  var definition = DateFormatSymbols.definitions[key];
  if (!definition)
  {
    xdo.require("xdo.io.Http");
    var param = 
    {
      locale: [locale]
    }
    var definition_js = xdo.io.Http.syncGet("mobile/js/xdo/i18n/metadata.jsp",param,false);
    eval(definition_js);
    definition = DateFormatSymbols.definitions[key];
  }
  return definition;
}


DateFormatSymbols.getInstance = function(locale)
{
  xdo.require('xdo.i18n.Locale');
  locale = locale || xdo.i18n.Locale.getDefault();

  var idx = 0;
  var symbols = DateFormatSymbols.lookup(locale);

  var dfs = new DateFormatSymbols();
  dfs.setAmPmStrings( symbols[idx++] );
  dfs.setEras( symbols[idx++] );
  dfs.setShortEras( symbols[idx++] );
  dfs.setLocalePatternChars( symbols[idx++] );
  dfs.setMonths( symbols[idx++] );
  dfs.setShortMonths( symbols[idx++] );
  dfs.setShortWeekdays( symbols[idx++] );
  dfs.setWeekdays( symbols[idx++] );
  dfs.setZoneStrings( symbols[idx++] );
  return dfs;
}

// fallback to English in case no definition registered.
var symbols = [];
symbols.push(['AM', 'PM']);
symbols.push(['BC', 'AD']);
symbols.push(['BC', 'AD']);
symbols.push('GyMdkHmsSEDFwWahKzZ');
symbols.push(['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December', '']);
symbols.push(['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', '']);
symbols.push(['', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']);
symbols.push(['', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']);
symbols.push([[]]);
DateFormatSymbols.register('en', symbols);

})();


(function(){
xdo.bind("xdo.i18n.DecimalFormatSymbols", DecimalFormatSymbols);

// This class behaves just like text formatting class in Java SDK.
// See JavaDoc API for usage.
// http://java.sun.com/javase/6/docs/api/java/text/DecimalFormatSymbols.html

function DecimalFormatSymbols()
{
  this.currencySymbol = '';
  this.decimalSeparator = '';
  this.digit = '';
  this.exponentSeparator = '';
  this.groupingSeparator = '';
  this.infinity = '';
  this.minusSign = '';
  this.internationalCurrencySymbol = '';
  this.monetaryDecimalSeparator = '';
  this.nan = '';
  this.patternSeparator = '';
  this.percent = '';
  this.perMill = '';
  this.zeroDigit = '';
}

DecimalFormatSymbols.prototype.getCurrencySymbol = function()
{
  return this.currencySymbol;
}

DecimalFormatSymbols.prototype.setCurrencySymbol = function(currencySymbol)
{
  this.currencySymbol = currencySymbol;
}

DecimalFormatSymbols.prototype.getDecimalSeparator = function()
{
  return this.decimalSeparator;
}

DecimalFormatSymbols.prototype.setDecimalSeparator = function(decimalSeparator)
{
  this.decimalSeparator = decimalSeparator;
}

DecimalFormatSymbols.prototype.getDigit = function()
{
  return this.digit;
}

DecimalFormatSymbols.prototype.setDigit = function(digit)
{
  this.digit = digit;
}

DecimalFormatSymbols.prototype.getExponentSeparator = function()
{
  return this.exponentSeparator;
}

DecimalFormatSymbols.prototype.setExponentSeparator = function(exponentSeparator)
{
  this.exponentSeparator = exponentSeparator;
}

DecimalFormatSymbols.prototype.getGroupingSeparator = function()
{
  return this.groupingSeparator;
}

DecimalFormatSymbols.prototype.setGroupingSeparator = function(groupingSeparator)
{
  this.groupingSeparator = groupingSeparator;
}

DecimalFormatSymbols.prototype.getInfinity = function()
{
  return this.infinity;
}

DecimalFormatSymbols.prototype.setInfinity = function(infinity)
{
  this.infinity = infinity;
}

DecimalFormatSymbols.prototype.getInternationalCurrencySymbol = function()
{
  return this.internationalCurrencySymbol;
}

DecimalFormatSymbols.prototype.setInternationalCurrencySymbol = function(internationalCurrencySymbol)
{
  this.internationalCurrencySymbol = internationalCurrencySymbol;
}

DecimalFormatSymbols.prototype.getMinusSign = function()
{
  return this.minusSign;
}

DecimalFormatSymbols.prototype.setMinusSign = function(minusSign)
{
  this.minusSign = minusSign;
}

DecimalFormatSymbols.prototype.getMonetaryDecimalSeparator = function()
{
  return this.monetaryDecimalSeparator;
}

DecimalFormatSymbols.prototype.setMonetaryDecimalSeparator = function(monetaryDecimalSeparator)
{
  this.monetaryDecimalSeparator = monetaryDecimalSeparator;
}

DecimalFormatSymbols.prototype.getNaN = function()
{
  return this.nan;
}

DecimalFormatSymbols.prototype.setNaN = function(nan)
{
  this.nan = nan;
}

DecimalFormatSymbols.prototype.getPatternSeparator = function()
{
  return this.patternSeparator;
}

DecimalFormatSymbols.prototype.setPatternSeparator = function(patternSeparator)
{
  this.patternSeparator = patternSeparator;
}

DecimalFormatSymbols.prototype.getPercent = function()
{
  return this.percent;
}

DecimalFormatSymbols.prototype.setPercent = function(percent)
{
  this.percent = percent;
}

DecimalFormatSymbols.prototype.getPerMill = function()
{
  return this.perMill;
}

DecimalFormatSymbols.prototype.setPerMill = function(perMill)
{
  this.perMill = perMill;
}

DecimalFormatSymbols.prototype.getZeroDigit = function()
{
  return this.zeroDigit;
}

DecimalFormatSymbols.prototype.setZeroDigit = function(zeroDigit)
{
  this.zeroDigit = zeroDigit;
}

DecimalFormatSymbols.prototype.clone = function()
{
  function clone(obj)
  {
    var copy = null;
    if (obj.constructor.name == 'array')
    {
      copy = [];
      for (var i=0; i<arr.length; i++)
      {
        copy[i] = clone(arr[i]);
      }
    }
    else
      copy = obj;
  
    return copy;
  }
  
  var copy = new DecimalFormatSymbols();
  copy.setCurrencySymbol( clone(this.getCurrencySymbol()) );
  copy.setDecimalSeparator( clone(this.getDecimalSeparator()) );
  copy.setDigit( clone(this.getDigit()) );
  copy.setExponentSeparator( clone(this.getExponentSeparator()) );
  copy.setGroupingSeparator( clone(this.getGroupingSeparator()) );
  copy.setInfinity( clone(this.getInfinity()) );
  copy.setInternationalCurrencySymbol( clone(this.getInternationalCurrencySymbol()) );
  copy.setMinusSign( clone(this.getMinusSign()) );
  copy.setMonetaryDecimalSeparator( clone(this.getMonetaryDecimalSeparator()) );
  copy.setNaN( clone(this.getNaN()) );
  copy.setPatternSeparator( clone(this.getPatternSeparator()) );
  copy.setPercent( clone(this.getPercent()) );
  copy.setPerMill( clone(this.getPerMill()) );
  copy.setZeroDigit( clone(this.getZeroDigit()) );
  return copy;
}

DecimalFormatSymbols.definitions = {};

DecimalFormatSymbols.register = function(locale, symbols)
{
  var key = locale.toString();
  DecimalFormatSymbols.definitions[key] = symbols;
}

DecimalFormatSymbols.lookup = function(locale)
{
  var key = locale.toString();
  var definition = DecimalFormatSymbols.definitions[key];
  if (!definition)
  {
    xdo.require("xdo.io.Http");
    var param = 
    {
      locale: [locale]
    }
    var definition_js = xdo.io.Http.syncGet("mobile/js/xdo/i18n/metadata.jsp",param,false);
    eval(definition_js);
    definition = DecimalFormatSymbols.definitions[key];
  }
  return definition;
}


DecimalFormatSymbols.getInstance = function(locale)
{
  xdo.require('xdo.i18n.Locale');
  locale = locale || xdo.i18n.Locale.getDefault();

  var idx = 0;
  var symbols = DecimalFormatSymbols.lookup(locale);

  var dfs = new DecimalFormatSymbols();
  dfs.setCurrencySymbol( symbols[idx++] );
  dfs.setDecimalSeparator( symbols[idx++] );
  dfs.setDigit( symbols[idx++] );
  dfs.setExponentSeparator( symbols[idx++] );
  dfs.setGroupingSeparator( symbols[idx++] );
  dfs.setInfinity( symbols[idx++] );
  dfs.setInternationalCurrencySymbol( symbols[idx++] );
  dfs.setMinusSign( symbols[idx++] );
  dfs.setMonetaryDecimalSeparator( symbols[idx++] );
  dfs.setNaN( symbols[idx++] );
  dfs.setPatternSeparator( symbols[idx++] );
  dfs.setPercent( symbols[idx++] );
  dfs.setPerMill( symbols[idx++] );
  dfs.setZeroDigit( symbols[idx++] );
  return dfs;
}

// fallback to English in case no definition registered.
var symbols = [];
symbols.push('¤');
symbols.push('.');
symbols.push('#');
symbols.push('E');
symbols.push(',');
symbols.push('∞');
symbols.push('XXX');
symbols.push('-');
symbols.push('.');
symbols.push('�');
symbols.push(';');
symbols.push('%');
symbols.push('‰');
symbols.push('0');
DecimalFormatSymbols.register('en', symbols);

})();


(function(){
xdo.bind("xdo.i18n.NumberFormat", NumberFormat);

// This class behaves just like text formatting class in Java SDK.
// See JavaDoc API for usage.
// http://java.sun.com/javase/6/docs/api/java/text/NumberFormat.html

// This is proxy for DecimalFormat class.
// Use static method in this class to instanciate formatter object.

function NumberFormat()
{
}

NumberFormat.prototype.format = function(number)
{
  // subclass need to implemented this method.
  return null;
}

NumberFormat.prototype.parse = function(text)
{
  // subclass need to implemented this method.
  return null;
}

NumberFormat.getInstance = function(locale)
{
  xdo.require('xdo.i18n.Locale');
  locale = locale || xdo.i18n.Locale.getDefault();

  xdo.require("xdo.i18n.DecimalFormat");
  xdo.require("xdo.i18n.DecimalFormatSymbols");
  var pattern = NumberFormat.lookup(locale, 'default');
  var dfs = xdo.i18n.DecimalFormatSymbols.getInstance(locale);
  return new xdo.i18n.DecimalFormat(pattern, dfs);
}

NumberFormat.getIntegerInstance = function(locale)
{
  xdo.require('xdo.i18n.Locale');
  locale = locale || xdo.i18n.Locale.getDefault();

  xdo.require("xdo.i18n.DecimalFormat");
  xdo.require("xdo.i18n.DecimalFormatSymbols");
  var pattern = NumberFormat.lookup(locale, 'integer');
  var dfs = xdo.i18n.DecimalFormatSymbols.getInstance(locale);
  return new xdo.i18n.DecimalFormat(pattern, dfs);
}

NumberFormat.getCurrencyInstance = function(locale)
{
  xdo.require('xdo.i18n.Locale');
  locale = locale || xdo.i18n.Locale.getDefault();

  xdo.require("xdo.i18n.DecimalFormat");
  xdo.require("xdo.i18n.DecimalFormatSymbols");
  var pattern = NumberFormat.lookup(locale, 'currency');
  var dfs = xdo.i18n.DecimalFormatSymbols.getInstance(locale);
  return new xdo.i18n.DecimalFormat(pattern, dfs);
}

NumberFormat.getPercentInstance = function(locale)
{
  xdo.require('xdo.i18n.Locale');
  locale = locale || xdo.i18n.Locale.getDefault();

  xdo.require("xdo.i18n.DecimalFormat");
  xdo.require("xdo.i18n.DecimalFormatSymbols");
  var pattern = NumberFormat.lookup(locale, 'percent');
  var dfs = xdo.i18n.DecimalFormatSymbols.getInstance(locale);
  return new xdo.i18n.DecimalFormat(pattern, dfs);
}


NumberFormat.definitions = {};

NumberFormat.register = function(locale, type, pattern)
{
  var key = locale + '/' + type;
  NumberFormat.definitions[key] = pattern;
}

NumberFormat.lookup = function(locale, type)
{
  var key = locale.toString() + '/' + type;
  var definition = NumberFormat.definitions[key];
  if (!definition)
  {
    xdo.require("xdo.io.Http");
    var param = 
    {
      locale: [locale]
    }
    var definition_js = xdo.io.Http.syncGet("mobile/js/xdo/i18n/metadata.jsp",param,false);
    eval(definition_js);
    definition = NumberFormat.definitions[key];
  }
  return definition;
}

// fallback to English in case no definition registered.
NumberFormat.register('en', 'default', '#,##0.###');
NumberFormat.register('en', 'integer', '#,##0');
NumberFormat.register('en', 'percent', '#,##0%');
NumberFormat.register('en', 'currency', '¤#,##0.00');

})();


(function(){
xdo.bind("xdo.i18n.DecimalFormat", DecimalFormat);
xdo.require("xdo.i18n.DecimalFormatSymbols");
xdo.require("xdo.i18n.NumberFormat");
xdo.extend(DecimalFormat, xdo.i18n.NumberFormat);

// It is not recommended to use constructor to instanciate this class object.
// Use xdo.i18n.NumberFormat.getInstance() static method instead.
//
// This class behaves just like text formatting class in Java SDK.
// See JavaDoc API for usage.
// http://java.sun.com/javase/6/docs/api/java/text/DecimalFormat.html

// TODO: Exponential expression support.

function DecimalFormat(pattern, decimalFormatSymbols)
{
  pattern = pattern || "";
  decimalFormatSymbols = decimalFormatSymbols || xdo.i18n.DecimalFormatSymbols.getInstance();

  DecimalFormat.superclass.constructor.apply(this,[]);
  
  this.decimalFormatSymbols = decimalFormatSymbols;
  this.decimalSeparatorAlwaysShown = false;
  this.groupingUsed = true;
  this.groupingSize = 3;
  this.maximumFractionDigits = Number.MAX_VALUE; // should be log10(Number.MAX_VALUE)
  this.maximumIntegerDigits = Number.MAX_VALUE;
  this.minimumFractionDigits = 2;
  this.minimumIntegerDigits = 1;
  this.multiplier = 1;
  this.negativePrefix = '';
  this.negativeSuffix = '';
  this.positivePrefix = '';
  this.positiveSuffix = '';

  this.applyPattern(pattern);
}

DecimalFormat.prototype.getDecimalFormatSymbols = function()
{
  return this.decimalFormatSymbols;
}

DecimalFormat.prototype.setDecimalFormatSymbols = function(decimalFormatSymbols)
{
  this.decimalFormatSymbols = decimalFormatSymbols;
}

DecimalFormat.prototype.applyPattern = function(pattern)
{
  function searchWithEscapeSupport(str, regexp)
  {
    var escapeChar = "'";

    var offset = 0;
    while (true)
    {
      var idx = str.search(regexp);
      if (idx==-1)
        break;

      // if previous portion of string contains odd number of escape char,
      // the matched portion is within the quotation, and should be ignored.
      var quoted = str.substring(0,idx).split(escapeChar).length%2==0;
      if (quoted)
      {
        offset += idx;
        str = str.substring(idx+1);
        continue;
      }

      return offset + idx;
    }

    return -1;
  }

  // split into prefix, number, and suffix.
  function splitPart(pattern)
  {
    var buffer = pattern;

    var idx = searchWithEscapeSupport(buffer, /[0#\.,E]+/);
    idx = idx!=-1? idx: buffer.length;
    var prefix = buffer.substring(0,idx);
    buffer = buffer.substring(idx);

    idx = searchWithEscapeSupport(buffer, /[^0#\.,E]+/);
    idx = idx!=-1? idx: buffer.length;
    var number = buffer.substring(0,idx);
    var suffix = buffer.substring(idx);

    return {prefix:prefix, number:number, suffix:suffix};
  }

  var idx = searchWithEscapeSupport(pattern, ";");
  var positivePattern = idx!=-1? pattern.substring(0,idx): pattern;
  var negativePattern = idx!=-1? pattern.substring(idx+1): '-'+pattern;

  var positive = splitPart(positivePattern);
  var negative = splitPart(negativePattern);
  this.setPositivePrefix(positive.prefix);
  this.setPositiveSuffix(positive.suffix);
  this.setNegativePrefix(negative.prefix);
  this.setNegativeSuffix(negative.suffix);

  var numberPattern = positive.number;
  var result = numberPattern.match(/^([#0,]*)\.?([0#,]*)E?([0]*)$/);
  if (result)
  {
    var integerPattern = result[1];
    var fractionPattern = result[2];
    var exponentPattern = result[3];

    this.setDecimalSeparatorAlwaysShown( numberPattern.indexOf('.')!=-1 && fractionPattern.length==0 );
    this.setGroupingUsed( integerPattern.indexOf(',')!=-1 );
    this.setGroupingSize( this.isGroupingUsed()? integerPattern.length-integerPattern.lastIndexOf(',')-1: 0);

    this.setMinimumIntegerDigits( integerPattern.replace(/[#,]/g,'').length );
    this.setMaximumIntegerDigits( integerPattern.replace(/,/g,'').length );
    this.setMinimumFractionDigits( fractionPattern.replace(/[#,]/g,'').length );
    this.setMaximumFractionDigits( fractionPattern.replace(/,/g,'').length );
  }

  if (positivePattern.indexOf('%')!=-1 && positivePattern.indexOf('\u2030 ')!=-1)
      throw new Error("Too many percent/per mille characters in pattern.");
  if (positivePattern.indexOf('%')!=-1)
    this.setMultiplier(100);
  if (positivePattern.indexOf('\u2030')!=-1)
    this.setMultiplier(1000);
}

DecimalFormat.prototype.isDecimalSeparatorAlwaysShown = function()
{
  return this.decimalSeparatorAlwaysShown;
}

DecimalFormat.prototype.setDecimalSeparatorAlwaysShown = function(decimalSeparatorAlwaysShown)
{
  this.decimalSeparatorAlwaysShown = decimalSeparatorAlwaysShown;
}

DecimalFormat.prototype.getGroupingSize = function()
{
  return this.groupingSize;
}

DecimalFormat.prototype.setGroupingSize = function(groupingSize)
{
  this.groupingSize = groupingSize;
}

DecimalFormat.prototype.isGroupingUsed = function()
{
  return this.groupingUsed;
}

DecimalFormat.prototype.setGroupingUsed = function(groupingUsed)
{
  this.groupingUsed = groupingUsed;
}

DecimalFormat.prototype.getMaximumFractionDigits = function()
{
  return this.maximumFractionDigits;
}

DecimalFormat.prototype.setMaximumFractionDigits = function(maximumFractionDigits)
{
  this.maximumFractionDigits = maximumFractionDigits;
}

DecimalFormat.prototype.getMaximumIntegerDigits = function()
{
  return this.maximumIntegerDigits;
}

DecimalFormat.prototype.setMaximumIntegerDigits = function(maximumIntegerDigits)
{
  this.maximumIntegerDigits = maximumIntegerDigits;
}

DecimalFormat.prototype.getMinimumFractionDigits = function()
{
  return this.minimumFractionDigits;
}

DecimalFormat.prototype.setMinimumFractionDigits = function(minimumFractionDigits)
{
  this.minimumFractionDigits = minimumFractionDigits;
}

DecimalFormat.prototype.getMinimumIntegerDigits = function()
{
  return this.minimumIntegerDigits;
}

DecimalFormat.prototype.setMinimumIntegerDigits = function(minimumIntegerDigits)
{
  this.minimumIntegerDigits = minimumIntegerDigits;
}

DecimalFormat.prototype.getMultiplier = function()
{
  return this.multiplier;
}

DecimalFormat.prototype.setMultiplier = function(multiplier)
{
  this.multiplier = multiplier;
}

DecimalFormat.prototype.getNegativePrefix = function()
{
  return this.negativePrefix;
}

DecimalFormat.prototype.setNegativePrefix = function(negativePrefix)
{
  this.negativePrefix = negativePrefix;
}

DecimalFormat.prototype.getNegativeSuffix = function()
{
  return this.negativeSuffix;
}

DecimalFormat.prototype.setNegativeSuffix = function(negativeSuffix)
{
  this.negativeSuffix = negativeSuffix;
}

DecimalFormat.prototype.getPositivePrefix = function()
{
  return this.positivePrefix;
}

DecimalFormat.prototype.setPositivePrefix = function(positivePrefix)
{
  this.positivePrefix = positivePrefix;
}

DecimalFormat.prototype.getPositiveSuffix = function()
{
  return this.positiveSuffix;
}

DecimalFormat.prototype.setPositiveSuffix = function(positiveSuffix)
{
  this.positiveSuffix = positiveSuffix;
}

DecimalFormat.prototype.format = function(number)
{
  var dfs = this.getDecimalFormatSymbols();

  if (number==undefined || number==null)
    return dfs.getNaN();
  if (typeof number == 'object')
  {
    if (number.constructor==Number)
      number = number.valueOf();
    else
      return dfs.getNaN();
  }
  
  // for per cent or per mille.
  var multiplier = this.getMultiplier();
  number = parseFloat(number) * multiplier;
  
  // round to specified digits.
  var maxfd = this.getMaximumFractionDigits();
  number = Math.round(number * Math.pow(10,maxfd)) / Math.pow(10,maxfd);

  var numberStr = number.toString();

  // split into minus, integer, and fraction part.
  var decimalStr = null;
  var result = numberStr.match(/(\-?)(\d+).?(\d*)/);
  if (result)
  {
    var minusStr = result[1];
    var integerStr = result[2];
    var fractionStr = result[3];

    // format integer part.
    var minid = this.getMinimumIntegerDigits();
    for (var i=integerStr.length; i<minid; i++)
      integerStr = '0' + integerStr;
    if (this.isGroupingUsed())
    {
      var integerGroupRE = new RegExp("^(.*)(\\d{"+this.getGroupingSize()+"})$");
      var integerGroups = [];
      while (integerStr!='')
      {
        var result = integerStr.match(integerGroupRE);
        if (result)
        {
          integerGroups.unshift(result[2]);
          integerStr = result[1];
        }
        else
        {
          integerGroups.unshift(integerStr);
          integerStr = '';
        }
      }
      integerStr = integerGroups.join(',');
    }
  
    // fraction part.
    var minfd = this.getMinimumFractionDigits();
    for (var i=fractionStr.length; i<minfd; i++)
      fractionStr = fractionStr + '0';
    
    // join integer part and fraction part.
    var decimalSeparator = (fractionStr!='' || this.isDecimalSeparatorAlwaysShown())? '.': '';
    decimalStr = integerStr + decimalSeparator + fractionStr;
  }
  else
  {
    // for 'Infinity', '-Infinity', and 'NaN'.
    var result = numberStr.match(/(\-?)(.+)/);
    if (result)
    {
      var minusStr = result[1];
      decimalStr = result[2];
    }
  }

  // add prefix and suffix.
  var prefix = !isNaN(number)? (number>=0? this.getPositivePrefix(): this.getNegativePrefix()): '';
  var suffix = !isNaN(number)? (number>=0? this.getPositiveSuffix(): this.getNegativeSuffix()): '';

  return localizeText(prefix) + localizeNumber(decimalStr) + localizeText(suffix);

  function localizeText(str)
  {
    var text = "";
    
    // build lookup table.
    var translation = {};
    translation['-'] = dfs.getMinusSign();
    translation['%'] = dfs.getPercent();
    translation['\u2030'] = dfs.getPerMill();
    translation['\u00A4'] = dfs.getCurrencySymbol();

    var strarr = str.split('');
    var escaped = false;
    for (var i=0; i<strarr.length; i++)
    {
      var ch = strarr[i];
      
      if (escaped)
      {
        if (ch=='\'')
        {
          escaped = false;
          continue;
        }
        else
          text += ch;
      }

      if (ch=='\'')
      {
        if (strarr[i+1]=='\'')
        {
          text += ch;
          i++;
        }
        else
          escaped = true;
      }
      else
        text += translation[ch] || ch;
    }
    
    return text;
  }

  function localizeNumber(str)
  {
    var text = "";
    
    // build lookup table.
    var translation = {};
    translation[','] = dfs.getGroupingSeparator();
    translation['.'] = dfs.getDecimalSeparator();
    translation['-'] = dfs.getMinusSign();
    translation['e'] = dfs.getExponentSeparator();
    translation['Infinity'] = dfs.getInfinity();
    translation['NaN'] = dfs.getNaN();
    for (var i=0; i<10; i++)
      translation[i] = String.fromCharCode(dfs.getZeroDigit().charCodeAt(0)+i);

    // for 'Infinity', '-Infinity', and 'NaN'.
    if (translation[str])
      return translation[str];
    
    // translate using lookup table.
    var strarr = str.split('');
    for (var i=0; i<strarr.length; i++)
    {
      var ch = strarr[i];
      if (ch in translation)
        text += translation[ch];
      else
        throw new Error("Invalid character in number string. [" + ch + "]");
    }
    
    return text;
  }
}

/**
 * Parses the string and returns the number value.
 * 
 * @param {String} text text representation of the locale sensitive number value.
 * @return {Number} number value of the given string.
 */
DecimalFormat.prototype.parse = function(text)
{
  var number = null;

  var dfs = this.getDecimalFormatSymbols();

  try
  {
    var isMinusValue = false;
    var numberStr = null;
    var positivePrefix = localizeText(this.positivePrefix);
    var positiveSuffix = localizeText(this.positiveSuffix);
    var negativePrefix = localizeText(this.negativePrefix);
    var negativeSuffix = localizeText(this.negativeSuffix);
    if (text.indexOf(negativePrefix)==0 && text.lastIndexOf(negativeSuffix)==text.length-negativeSuffix.length)
    {
      isMinusValue = true;
      numberStr = text.slice(negativePrefix.length, text.length-negativeSuffix.length);
    }
    else if (text.indexOf(positivePrefix)==0 && text.lastIndexOf(positiveSuffix)==text.length-positiveSuffix.length)
    {
      isMinusValue = false;
      numberStr = text.slice(positivePrefix.length, text.length-positiveSuffix.length);
    }
    else if (text==dfs.getNaN())
    {
      isMinusValue = false;
      numberStr = text;
    }
    else
      throw new Error("Prefix and suffix did not match.");
    
    numberStr = standardizeNumber(numberStr);
    number = parseFloat(numberStr);
    number *= isMinusValue? -1: 1;
    number /= this.getMultiplier();
  }
  catch (ex)
  {
    return null;
  }

  return number;

  
  function localizeText(str)
  {
    var text = "";
    
    // build lookup table.
    var translation = {};
    translation['-'] = dfs.getMinusSign();
    translation['%'] = dfs.getPercent();
    translation['\u2030'] = dfs.getPerMill();
    translation['\u00A4'] = dfs.getCurrencySymbol();

    var strarr = str.split('');
    var escaped = false;
    for (var i=0; i<strarr.length; i++)
    {
      var ch = strarr[i];
      
      if (escaped)
      {
        if (ch=='\'')
        {
          escaped = false;
          continue;
        }
        else
          text += ch;
      }

      if (ch=='\'')
      {
        if (strarr[i+1]=='\'')
        {
          text += ch;
          i++;
        }
        else
          escaped = true;
      }
      else
        text += translation[ch] || ch;
    }
    
    return text;
  }
  
  function standardizeNumber(str)
  {
    var text = "";
    
    // Although NaN of most of locale is char '0xfffd', some locale is just string "NaN".
    if (str=="NaN")
      return str;
    
    // build lookup table.
    var translation = {};
    translation[dfs.getGroupingSeparator()] = ''; // remove grouping separator
    translation[dfs.getDecimalSeparator()] = '.';
    translation[dfs.getExponentSeparator()] = 'e';
    translation[dfs.getInfinity()] = 'Infinity';
    translation[dfs.getNaN()] = 'NaN';
    for (var i=0; i<10; i++)
      translation[String.fromCharCode(dfs.getZeroDigit().charCodeAt(0)+i)] = new String(i);
    
    // translate using lookup table.
    var strarr = str.split('');
    for (var i=0; i<strarr.length; i++)
    {
      var ch = strarr[i];
      if (ch in translation)
        text += translation[ch];
      else
        throw new Error("Invalid character in number string. [" + ch + "]");
    }
    
    return text;
  }
}

DecimalFormat.prototype.toPattern = function()
{
  // integer part.
  var integerPattern = "";
  var groupingSize = this.getGroupingSize();
  var integerMinLen = this.getMinimumIntegerDigits();
  for (var i=integerMinLen; i<groupingSize+1; i++)
    integerPattern += '#';
  for (var i=0; i<integerMinLen; i++)
    integerPattern += '0';
  
  if (this.isGroupingUsed())
  {
    var integerGroupRE = new RegExp("(.*)([0#]{"+groupingSize+"})$");
    var integerGroups = [];
    while (integerPattern!='')
    {
      var result = integerPattern.match(integerGroupRE);
      if (result)
      {
        integerGroups.unshift(result[2]);
        integerPattern = result[1];
      }
      else
      {
        integerGroups.unshift(integerPattern);
        integerPattern = '';
      }
    }
    var groupingSeparator = ',';
    integerPattern = integerGroups.join(groupingSeparator);
  }

  // fraction part.
  var fractionPattern = "";
  var groupingSize = this.getGroupingSize();
  var fractionMinLen = this.getMinimumFractionDigits();
  for (var i=0; i<fractionMinLen; i++)
    fractionPattern += '0';

  // join integer part and fraction part.
  var decimalSeparator = '.';
  var decimalPattern = integerPattern + (fractionPattern? decimalSeparator + fractionPattern: '');
  
  // add prefix and suffix.
  var positivePattern = this.getPositivePrefix() + decimalPattern + this.getPositiveSuffix();
  var negativePattern = this.getNegativePrefix() + decimalPattern + this.getNegativeSuffix();
  return positivePattern + (('-'+positivePattern!=negativePattern)? ';' + negativePattern: '');
}

DecimalFormat.prototype.clone = function()
{
  var pattern = this.toPattern();
  var dfs = this.getDecimalFormatSymbols().clone();
  return new DecimalFormat(pattern,dfs);
}

})();


(function(){
xdo.bind("xdo.i18n.Locale", Locale);

// This class behaves just like text formatting class in Java SDK.
// See JavaDoc API for usage.
// http://java.sun.com/javase/6/docs/api/java/util/Locale.html

function Locale(language, country, variant)
{
  this.language = language;
  this.country = country;
  this.variant = variant;
}

Locale.prototype.getLanguage = function()
{
  return this.language;
}

Locale.prototype.getCountry = function()
{
  return this.country;
}

Locale.prototype.getVariant = function()
{
  return this.variant;
}

Locale.prototype.getDisplayName = function()
{
  var display = Locale.lookup(this.toString());
  return display[0];
}

Locale.prototype.getDisplayLanguage = function()
{
  var display = Locale.lookup(this.toString());
  return  display[1];
}

Locale.prototype.getDisplayCountry = function()
{
  var display = Locale.lookup(this.toString());
  return display[2];
}

Locale.prototype.getDisplayVariant = function()
{
  var display = Locale.lookup(this.toString());
  return display[3];
}

Locale.prototype.toString = function()
{
  return this.language + (this.country? '_'+this.country + (this.variant? '_'+this.variant: ''): '');
}

Locale.prototype.clone = function()
{
  var language = this.getLanguage();
  var country = this.getCountry();
  var variant = this.getVariant();
  var copy = new xdo.i18n.Locale(language, country, variant);
  return copy;
}

Locale.prototype.equals = function(that)
{
  if (that === null || that === undefined)
    return false;
  if (! (that instanceof Locale))
    return false;
  
  return this.toString() === that.toString();
}

Locale.definitions = {};

Locale.register = function(locale, displayName, displayLanguage, displayCountry, displayVariant)
{
  var key = locale;
  Locale.definitions[key] = [displayName, displayLanguage, displayCountry, displayVariant];
}

Locale.lookup = function(locale)
{
  var key = locale.toString();
  var definition = Locale.definitions[key];
  if (!definition)
  {
    xdo.require("xdo.io.Http");
    var param = 
    {
      locale: [locale]
    }
    var definition_js = xdo.io.Http.syncGet("mobile/js/xdo/i18n/metadata.jsp",param,false);
    eval(definition_js);
    definition = Locale.definitions[key];
  }
  return definition;
}


Locale.availableLocales = [];

Locale.getAvailableLocales = function()
{
  return Locale.availableLocales;
}

Locale.setAvailableLocales = function(availableLocales)
{
  Locale.availableLocales = availableLocales;
}


Locale.defaultInstance = null;

Locale.getDefault = function()
{
  return Locale.defaultInstance;
}

Locale.setDefault = function(locale)
{
  Locale.defaultInstance = locale;
}

Locale.createInstance = function(str)
{
  if (!str)
    return null;

  var params = str.split("_");
  var language = params[0];
  var country = params[1];
  var variant = params[2];
  return new Locale(language,country,variant)
}

// fallback to English in case no definition registered.
Locale.register('en', 'English', 'English', '', '');


Locale.ENGLISH = new Locale('en');
Locale.setDefault(Locale.ENGLISH);

})();


(function(){
xdo.bind("xdo.i18n.DateFormat", DateFormat);

// This class behaves just like text formatting class in Java SDK.
// See JavaDoc API for usage.
// http://java.sun.com/javase/6/docs/api/java/text/DateFormat.html

// This is proxy for SimpleDateFormat class.
// Use static method in this class to instanciate formatter object.

function DateFormat()
{
}

DateFormat.prototype.format = function(date)
{
  // subclass need to implemented this method.
  return null;
}

DateFormat.prototype.parse = function(text)
{
  // subclass need to implemented this method.
  return null;
}

DateFormat.FULL = 0;
DateFormat.LONG =1;
DateFormat.MEDIUM = 2;
DateFormat.SHORT = 3;

DateFormat.getInstance = function()
{
  return DateFormat.getDateTimeInstance(DateFormat.SHORT, DateFormat.SHORT);
}

DateFormat.getDateTimeInstance = function(dateStyle, timeStyle, locale)
{
  xdo.require("xdo.i18n.Locale");
  locale = locale || xdo.i18n.Locale.getDefault();

  xdo.require("xdo.i18n.SimpleDateFormat");
  var pattern = DateFormat.lookup(locale, dateStyle, timeStyle);
  return new xdo.i18n.SimpleDateFormat(pattern, locale);
}

DateFormat.getDateInstance = function(dateStyle, locale)
{
  return DateFormat.getDateTimeInstance(dateStyle, -1, locale);
}

DateFormat.getTimeInstance = function(timeStyle, locale)
{
  return DateFormat.getDateTimeInstance(-1, timeStyle, locale);
}


DateFormat.definitions = {};

DateFormat.register = function(locale, dateStyle, timeStyle, pattern)
{
  var key = locale + '/' + dateStyle + '/' + timeStyle;
  DateFormat.definitions[key] = pattern;
}

DateFormat.lookup = function(locale, dateStyle, timeStyle)
{
  var key = locale.toString() + '/' + dateStyle + '/' + timeStyle;
  var definition = DateFormat.definitions[key];
  if (!definition)
  {
    xdo.require("xdo.io.Http");
    var param = 
    {
      locale: [locale]
    }
    var definition_js = xdo.io.Http.syncGet("mobile/js/xdo/i18n/metadata.jsp",param,false);
    eval(definition_js);
    definition = DateFormat.definitions[key];
  }
  return definition;
}

// fallback to English in case no definition registered.
DateFormat.register('en', '0', '0', 'EEEE, MMMM d, yyyy h:mm:ss a z');
DateFormat.register('en', '0', '1', 'EEEE, MMMM d, yyyy h:mm:ss a z');
DateFormat.register('en', '0', '2', 'EEEE, MMMM d, yyyy h:mm:ss a');
DateFormat.register('en', '0', '3', 'EEEE, MMMM d, yyyy h:mm a');
DateFormat.register('en', '0', '-1', 'EEEE, MMMM d, yyyy');
DateFormat.register('en', '1', '0', 'MMMM d, yyyy h:mm:ss a z');
DateFormat.register('en', '1', '1', 'MMMM d, yyyy h:mm:ss a z');
DateFormat.register('en', '1', '2', 'MMMM d, yyyy h:mm:ss a');
DateFormat.register('en', '1', '3', 'MMMM d, yyyy h:mm a');
DateFormat.register('en', '1', '-1', 'MMMM d, yyyy');
DateFormat.register('en', '2', '0', 'MMM d, yyyy h:mm:ss a z');
DateFormat.register('en', '2', '1', 'MMM d, yyyy h:mm:ss a z');
DateFormat.register('en', '2', '2', 'MMM d, yyyy h:mm:ss a');
DateFormat.register('en', '2', '3', 'MMM d, yyyy h:mm a');
DateFormat.register('en', '2', '-1', 'MMM d, yyyy');
DateFormat.register('en', '3', '0', 'M/d/yy h:mm:ss a z');
DateFormat.register('en', '3', '1', 'M/d/yy h:mm:ss a z');
DateFormat.register('en', '3', '2', 'M/d/yy h:mm:ss a');
DateFormat.register('en', '3', '3', 'M/d/yy h:mm a');
DateFormat.register('en', '3', '-1', 'M/d/yy');
DateFormat.register('en', '-1', '0', 'h:mm:ss a z');
DateFormat.register('en', '-1', '1', 'h:mm:ss a z');
DateFormat.register('en', '-1', '2', 'h:mm:ss a');
DateFormat.register('en', '-1', '3', 'h:mm a');

})();


(function(){
xdo.bind("xdo.i18n.FormatUtil", FormatUtil);

// Utility class to convert between Microsoft formatting mask and Java format mask. 
// http://msdn.microsoft.com/en-us/library/8kb3ddd4(v=vs.90).aspx
// http://docs.oracle.com/javase/7/docs/api/java/text/SimpleDateFormat.html

function FormatUtil() {
  
}

FormatUtil.ms2javaNumberFormatMask = function(msPattern) {
  throw new Error("Currently not supported.");
};

FormatUtil.java2msNumberFormatMask = function(javaPattern) {
  throw new Error("Currently not supported.");
};

FormatUtil.ms2javaDateFormatMask = function(msPattern) {
  // Use Java Date formatter only for tokenization.
  xdo.require("xdo.i18n.SimpleDateFormat");
  var fmt = new xdo.i18n.SimpleDateFormat(msPattern);
  var msPatternParts = fmt.patternParts;
  
  var javaPatternParts = msPatternParts.map(function(part) {
    // Day of week
    if (part.charAt(0) === "d" && part.length > 2) {
      return part.replace(/d/g, "E");
    }
    // Millisecond
    if (part.charAt(0) === "F") {
      return part.replace(/F/g, "S");
    }
    // AM/PM
    if (part.charAt(0) === "t") {
      return part.replace(/t/g, "a");
    }
    // Timezone
    if (part.charAt(0) === "z") {
      return part.replace(/z/g, "Z");
    }    
    return part;
  });
  
  return javaPatternParts.join("");
};


FormatUtil.java2msDateFormatMask = function(javaPattern) {
  xdo.require("xdo.i18n.SimpleDateFormat");
  var fmt = new xdo.i18n.SimpleDateFormat(javaPattern);
  var javaPatternParts = fmt.patternParts;
  
  var msPatternParts = javaPatternParts.map(function(part) {
    // Day of week
    if (part.charAt(0) === "E") {
      if (part.length <= 3) {
        return "ddd";
      } else {
        return part.replace(/E/g, "d");
      }
    }
    // Millisecond
    if (part.charAt(0) === "S") {
      return part.replace(/S/g, "F");
    }
    // AM/PM
    if (part.charAt(0) === "a") {
      return part.replace(/a/g, "t");
    }
    // Timezone
    if (part.charAt(0) === "Z") {
      return part.replace(/Z/g, "z");
    }
    return part;
  });
  
  return msPatternParts.join("");
};

})();


(function(){
/**
 * 
 */
xdo.bind("xdo.i18n.dataformat.AbstractDataFormatter", AbstractDataFormatter);

function AbstractDataFormatter(style, dataType) {
  this.style = style;
  this.dataType = dataType;
}

AbstractDataFormatter.prototype.getStyle = function() {
  return this.style;
};

AbstractDataFormatter.prototype.setStyle = function(style) {
  this.style = style;
};

AbstractDataFormatter.prototype.getLabel = function() {
  return "";
};

AbstractDataFormatter.prototype.getValue = function() {
  return "";
};

AbstractDataFormatter.prototype.canApply = function(dataType) {
  if (this.dataType) {
    var i, len = this.dataType.length;
    for (i=0; i<len; i++){
      if (this.dataType[i] === dataType)
        return true;
    }
  }
  return false;
};

AbstractDataFormatter.prototype.clone = function() {
  return new AbstractDataFormatter(this.style, this.dataType);
};

})();


(function(){
xdo.bind("xdo.i18n.dataformatter.MicrosoftNumberFormatter", MicrosoftNumberFormatter);
xdo.require("xdo.i18n.NumberFormat");
xdo.require("xdo.i18n.dataformatter.AbstractDataFormatter");
xdo.extend(MicrosoftNumberFormatter, xdo.i18n.dataformat.AbstractDataFormatter);

function MicrosoftNumberFormatter(formatter, value) {
  value = value !== undefined? value: -1234.5678901234567890;
  
  MicrosoftNumberFormatter.superclass.constructor.apply(this,['ms',['number']]);

  this.formatter = formatter;
  this.value = value;
  
  var fractionDigits = formatter.getMaximumFractionDigits();
  // Default number format is "#,##0.###" for most locales, but most of our users number field to show money amount, we change the default to "#,##0.##";
  // Bug#19709690 - 11.1.1.9.0:MAD:QA:DECIMAL SET TO 3 INVALID
  // For BIMAD we honor user setting so comment out the following 3 to 2 conversion logic.
  //fractionDigits = fractionDigits === 3? 2: fractionDigits;
  this.setFractionDigits(fractionDigits);
}

MicrosoftNumberFormatter.prototype.getLabel = function(){
  return this.formatter.format(this.value);
};

MicrosoftNumberFormatter.prototype.getValue = function(){
  var pattern = this.formatter.toPattern();
  var currencySymbol = this.formatter.getDecimalFormatSymbols().getCurrencySymbol();
  
  // Escape special characters in currency symbol.
  // i.e. Currency symbol for ru_RU is "py6.", and the last period must be escaped.
  currencySymbol = currencySymbol.replace("'", "''"); // Two single quote to create single quote itself.
  currencySymbol = currencySymbol.replace("0", "'0'");
  currencySymbol = currencySymbol.replace("#", "'#'");
  currencySymbol = currencySymbol.replace(".", "'.'");
  currencySymbol = currencySymbol.replace("-", "'-'");
  currencySymbol = currencySymbol.replace(",", "','");
  currencySymbol = currencySymbol.replace("E", "'E'");
  currencySymbol = currencySymbol.replace(";", "';'");
  currencySymbol = currencySymbol.replace("%", "'%'");
  currencySymbol = currencySymbol.replace("\u2030", "'\u2030'");
  currencySymbol = currencySymbol.replace("\u00A4", "'\u00A4'");
  
  return pattern.replace(new RegExp('\u00A4','g'), currencySymbol);
};

MicrosoftNumberFormatter.prototype.isGroupingUsed = function(){
  return this.formatter.isGroupingUsed();
};

MicrosoftNumberFormatter.prototype.setGroupingUsed = function(groupingUsed){
  this.formatter.setGroupingUsed(groupingUsed);
};

MicrosoftNumberFormatter.prototype.getFractionDigits = function(){
  return this.formatter.getMinimumFractionDigits();
};

MicrosoftNumberFormatter.prototype.setFractionDigits = function(fractionDigits){
  this.formatter.setMinimumFractionDigits(fractionDigits);
  this.formatter.setMaximumFractionDigits(fractionDigits);
};

MicrosoftNumberFormatter.prototype.clone = function(){
  var formatter = this.formatter.clone();
  return new MicrosoftNumberFormatter(formatter, this.value);
};


MicrosoftNumberFormatter.createInstance = function(pattern, locale, value){
  xdo.require("xdo.i18n.DecimalFormat");
  xdo.require("xdo.i18n.DecimalFormatSymbols");
  var dfs = xdo.i18n.DecimalFormatSymbols.getInstance(locale);
  var fmt = new xdo.i18n.DecimalFormat(pattern, dfs);
  return new MicrosoftNumberFormatter(fmt, value);
};

MicrosoftNumberFormatter.getInstance = function(locale, value){
  var fmt = new xdo.i18n.NumberFormat.getInstance(locale);
  return new MicrosoftNumberFormatter(fmt, value);
};

MicrosoftNumberFormatter.getPercentInstance = function(locale, value){
  var fmt = new xdo.i18n.NumberFormat.getPercentInstance(locale);
  return new MicrosoftNumberFormatter(fmt, value);
};

MicrosoftNumberFormatter.getCurrencyInstance = function(locale, value){
  var fmt = new xdo.i18n.NumberFormat.getCurrencyInstance(locale);
  return new MicrosoftNumberFormatter(fmt, value);
};

})();


(function(){
/**
 * 
 */
xdo.bind("xdo.i18n.dataformatter.MicrosoftDateFormatter", MicrosoftDateFormatter);
xdo.require("xdo.i18n.DateFormat");

function MicrosoftDateFormatter(){
 
}

/**
 * @param locale (xdo.i18n.Locale) locale instance.
 * @param dateFormat (int) one of these constants, or null to suppress date output.
 * @param timeFormat (int) one of these constants, or null to suppress time output.
 *   - xdo.i18n.DateFormat.FULL (0)
 *   - xdo.i18n.DateFormat.LONG (1)
 *   - xdo.i18n.DateFormat.MEDIUM (2)
 *   - xdo.i18n.DateFormat.SHORT (3)
 */
MicrosoftDateFormatter.getFormatter = function(locale, dateFormat, timeFormat, value)
{
  dateFormat = dateFormat!==undefined? dateFormat: -1;
  timeFormat = timeFormat!==undefined? timeFormat: -1;
  
  var formatter = null;
  if (dateFormat!=-1 && timeFormat!=-1)
    formatter = xdo.i18n.DateFormat.getDateTimeInstance(dateFormat, timeFormat, locale);
  else if (dateFormat!=-1)
    formatter = xdo.i18n.DateFormat.getDateInstance(dateFormat, locale);
  else if (timeFormat!=-1)
    formatter = xdo.i18n.DateFormat.getTimeInstance(timeFormat, locale);

  return formatter;
};

})();


(function(){
xdo.bind('xdo.stub.SystemIO', SystemIO);

function SystemIO()
{
}

SystemIO.prototype.log = function(level, message)
{
}

SystemIO.prototype.listSystemProperties = function(request)
{
  // hash map of name value pair.
  var props = {};

  xdo.require("xdo.i18n.Locale");
  props['user.locale'] = new xdo.i18n.Locale('en');
  
  return props;
}

SystemIO.prototype.listFonts = function()
{
  // array of xdo.lang.Font instances.
  
  // returns generic font families by default.
  // http://www.w3.org/TR/CSS2/fonts.html#generic-font-families
  xdo.require("xdo.lang.Font");
  var serif = new xdo.lang.Font(false, 'serif');
  var sansSerif = new xdo.lang.Font(false, 'sans-serif');
  var cursive = new xdo.lang.Font(false, 'cursive');
  var fantasy = new xdo.lang.Font(false, 'fantasy');
  var monospace = new xdo.lang.Font(false, 'monospace');

  return [serif, sansSerif, cursive, fantasy, monospace];
}

SystemIO.prototype.listLocales = function()
{
  // array of xdo.i18n.Locale instances.
  
  xdo.require("xdo.i18n.Locale");
  var en = new xdo.i18n.Locale('en');
  return [en];
}

SystemIO.prototype.listIPGLocales = function()
{
  // array of object with 'value' and 'label'.
  
  var en_US = {value: 'en_US', label: 'English (United States)'};
  return [en_US];
}

SystemIO.prototype.getDateInOracleAbstractFormat = function(date, locale)
{
  // hash map of abstract format mask and formatted text pair.
  var formattedTexts = {};
  
  formattedTexts["SHORT"] = null;
  formattedTexts["MEDIUM"] = null;
  formattedTexts["LONG"] = null;
  formattedTexts["SHORT_TIME"] = null;
  formattedTexts["MEDIUM_TIME"] = null;
  formattedTexts["LONG_TIME"] = null;
  formattedTexts["SHORT_TIME_TZ"] = null;
  formattedTexts["MEDIUM_TIME_TZ"] = null;
  formattedTexts["LONG_TIME_TZ"] = null;
  
  return formattedTexts;
}

SystemIO.getResourceURL = function(url)
{
  return null;
}

SystemIO.prototype.listFunctions = function(locale, timzezone)
{
  return [];
}


})();


(function(){
xdo.bind("xdo.app.System", System);
xdo.require("xdo.stub.SystemIO");

function System()
{
}

// see oracle.xdo.common.log.XDOLogConstants class for log level definition.
System.LOG_LEVEL =
{
  OFF: 0,
  STATEMENT: 1,
  PROCEDURE: 2,
  EVENT: 3,
  EXCEPTION: 4,
  ERROR: 5,
  UNEXPECTED: 6
}


System.lastException = null;
System.properties = null;
System.fonts = null;
System.locales = null;


System.getLastException = function()
{
  return this.lastException;
}

System.setLastException = function(lastException)
{
  this.lastException = lastException;
}

System.logError = function(message, url, line, exception)
{
  var buffer = message + "\n";
  buffer += "fileName: " + url + "\n";
  buffer += "lineNumber: " + line + "\n\n";

  if (exception)
  {
    var lines = [];
    var stacktrace = "not available.";
    
    for (var key in exception)
    {
      var value = exception[key];
      
      switch (key)
      {
        case 'stack':
          stacktrace = value;
          break;
          
        default:
          lines.push(key + ": " + value);
          break;
      }
    }

    buffer += "JavaScript Exception:\n" + lines.join('\n') + "\n\n";
    buffer += "JavaScript Stacktrace:\n" + stacktrace; 
  }
  
  this.log(System.LOG_LEVEL.UNEXPECTED, buffer);
}

System.log = function(level, message)
{
  return System.getStubInstance().log(level, message);
}

System.getProperty = function(key,defaultValue)
{
  var props = System.getProperties();
  return (key in props)? props[key]: defaultValue;
}

System.getProperties = function()
{
  if (System.properties === null) {
    System.properties = System.getStubInstance().listSystemProperties();
  }

  return System.properties;
}

System.getFonts = function()
{
  return System.getStubInstance().listFonts();
}

System.getLocales = function()
{
  return System.getStubInstance().listLocales();
}

System.getIPGLocales = function()
{
  return System.getStubInstance().listIPGLocales();
}

System.getDateInOracleAbstractFormat = function(date, locale)
{
  return System.getStubInstance().getDateInOracleAbstractFormat(date, locale);
}

System.getFunctions = function(locale, tz)
{
  return System.getStubInstance().listFunctions(locale, tz);
}

System.defaultStubClassName = "xdo.stub.SystemIO";
System.stubInstance = null;

System.getStubInstance = function()
{
  if (!System.stubInstance)
  {
    var stubClassName = window.getStubClassName? window.getStubClassName("xdo.app.System"): System.defaultStubClassName;
    xdo.require(stubClassName);
    var stubClass = eval(stubClassName);
    System.stubInstance = new stubClass();
  }
  return System.stubInstance;
}


System.init = function()
{
  System.properties = System.getProperties();

  xdo.require("xdo.lang.Font");
  var allFonts = System.getFonts();
  xdo.lang.Font.setAvailableFonts(allFonts);
  
  xdo.require("xdo.i18n.Locale");
  var allLocales = System.getLocales();
  xdo.i18n.Locale.setAvailableLocales(allLocales);
  var userLocale = System.getProperty("user.locale", "en");
  xdo.i18n.Locale.setDefault(userLocale);
}

})();


(function(){
xdo.bind("xdo.i18n.OracleDateFormat", OracleDateFormat);
xdo.require("xdo.app.System");
xdo.require("xdo.i18n.Locale");
xdo.require("xdo.i18n.DateFormat");
xdo.extend(OracleDateFormat, xdo.i18n.DateFormat);

function OracleDateFormat(pattern, locale)
{
  pattern = pattern || "";
  locale = locale || xdo.i18n.Locale.getDefault();
  
  OracleDateFormat.superclass.constructor.apply(this,[]);
  
  this.pattern = pattern;
  this.locale = locale;
  
  this.resultCache = {};
}

OracleDateFormat.prototype.format = function(date)
{
  var str = "";
  
  var locale = this.locale;
  
  if (this.isAbstractFormat())
  {
    var formattedTexts = null;
    
    var millis = date.getTime();
    if (millis in this.resultCache)
      formattedTexts = this.resultCache[millis];
    else
    {
      formattedTexts = xdo.app.System.getDateInOracleAbstractFormat(date, locale);
      this.resultCache[millis] = formattedTexts;
    }
    
    str = formattedTexts[this.pattern];
  }
  // FIXME: Non-abstract formatting should be able to be performed on client side, 
  // by converting oracle mask to ms mask. 
  // It's already achieved in following Java class. oracle.xdo.common.util.FormatUtil#getOraDateFormat.
  else
    throw new Error("Non-abstract formatting is not supported yet.");
  
  return str;
}

OracleDateFormat.prototype.toPattern = function()
{
  return this.pattern;
}

OracleDateFormat.prototype.clone = function()
{
  var pattern = this.toPattern();
  var locale = this.locale.clone();
  return new OracleDateFormat(pattern,locale);
}

OracleDateFormat.prototype.isAbstractFormat = function()
{
  switch (this.pattern)
  {
    case "SHORT":
    case "MEDIUM":
    case "LONG":
    case "SHORT_TIME":
    case "MEDIUM_TIME":
    case "LONG_TIME":
    case "SHORT_TIME_TZ":
    case "MEDIUM_TIME_TZ":
    case "LONG_TIME_TZ":
      return true;
    
    default:
      return false;
  }
}

})();


(function(){
xdo.bind("xdo.i18n.Calendar", Calendar);

function Calendar(locale, date)
{
  date = date!=undefined? date: new Date();
  
  this.locale = locale;
  this.date = date;
}


Calendar.ERA = 0;
Calendar.YEAR = 1;
Calendar.MONTH = 2;
Calendar.WEEK_OF_YEAR = 3;
Calendar.WEEK_OF_MONTH = 4;
Calendar.DATE = 5;
Calendar.DAY_OF_YEAR = 6;
Calendar.DAY_OF_MONTH = 7;
Calendar.DAY_OF_WEEK = 8;
Calendar.DAY_OF_WEEK_IN_MONTH = 9;
Calendar.AM_PM = 10;
Calendar.HOUR = 11;
Calendar.HOUR_OF_DAY = 12;
Calendar.MINUTE = 13;
Calendar.SECOND = 14;
Calendar.MILLISECOND = 15;
Calendar.ZONE_OFFSET = 16;
Calendar.DST_OFFSET = 17;

Calendar.getters =
[
  'getEra',
  'getYear',
  'getMonth',
  'getWeekOfYear',
  'getWeekOfMonth',
  'getDate',
  'getDayOfYear',
  'getDayOfMonth',
  'getDayOfWeek',
  'getDayOfWeekInMonth',
  'getAmPm',
  'getHour',
  'getHourOfDay',
  'getMinute',
  'getSecond',
  'getMillisecond',
  'getDstOffset',
  'getZoneOffset'
];

Calendar.prototype.get = function(field)
{
  var value = null;
  var date = this.date;
  
  // locale specific handlings.
  var localeStr = this.locale.toString();
  if (localeStr in Calendar)
  {
    var specialHandler = Calendar[localeStr];
    var getterFunc = specialHandler['get'];
    if (getterFunc)
    {
      value = getterFunc.apply(this,arguments);
      if (value != null)
        return value;
    }
  }
  
  switch (field)
  {
    case Calendar.ERA:
      value = date.getFullYear() < 0? 0: 1;
      break;

    case Calendar.YEAR:
      value = date.getFullYear();
      break;
    
    case Calendar.MONTH:
      value = date.getMonth();
      break;
      
    case Calendar.WEEK_OF_YEAR:
      var firstDayInYear = new Date(date.getFullYear(), 0, 1);
      var days = Math.ceil((date.getTime() - firstDayInYear.getTime()) / (7*24*60*60*1000));
      value = parseInt(days);
      break;
      
    case Calendar.WEEK_OF_MONTH:
      var firstDayInMonth = new Date(date.getFullYear(), date.getMonth(), 1);
      var offset = firstDayInMonth.getDay();
      var weekInMonth = Math.ceil((offset+date.getDate()) / 7);
      value = parseInt(weekInMonth);
      break;
      
    case Calendar.DATE:
      value = date.getDate();
      break;
      
    case Calendar.DAY_OF_YEAR:
      var firstDayInYear = new Date(date.getFullYear(), 0, 1);
      var days = Math.ceil((date.getTime() - firstDayInYear.getTime()) / (24*60*60*1000));
      value = parseInt(days);
      break;
      
    case Calendar.DAY_OF_MONTH:
      value = date.getDate();
      break;
      
    case Calendar.DAY_OF_WEEK:
      value = date.getDay() + 1;
      break;
      
    case Calendar.DAY_OF_WEEK_IN_MONTH:
      var dayOfWeekInMonth = Math.ceil(date.getDate() / 7);
      value = parseInt(dayOfWeekInMonth);
      break;
      
    case Calendar.AM_PM:
      value = date.getHours()<12? 0: 1;
      break;
      
    case Calendar.HOUR:
      value = date.getHours() % 12;
      break;
      
    case Calendar.HOUR_OF_DAY:
      value = date.getHours();
      break;
      
    case Calendar.MINUTE:
      value = date.getMinutes();
      break;
      
    case Calendar.SECOND:
      value = date.getSeconds();
      break;
      
    case Calendar.MILLISECOND:
      value = date.getMilliseconds();
      break;
      
    case Calendar.ZONE_OFFSET:
      value = date.getTimezoneOffset() * 60*1000;
      break;
      
    // FIXME: Daylight Saving Time not implemented.
    case Calendar.DST_OFFSET:
      // just return normal time zone offset.
      value = date.getTimezoneOffset() * 60*1000;
      break;
  }
  
  return value;
}



// Thai solar calendar
// http://en.wikipedia.org/wiki/Thai_solar_calendar
Calendar.th_TH =
Calendar.th_TH_TH =
{
  get : function(field)
  {
    var value = null;
    var date = this.date;
  
    switch (field)
    {
      case Calendar.ERA:
        var buddaYear = date.getFullYear() + 543;
        value = buddaYear < 0? 0: 1;
        break;
      
      case Calendar.YEAR:
        value = date.getFullYear() + 543;
        break;
    }
    
    return value;
  }
}



// Japanese imperial calendar.
// http://en.wikipedia.org/wiki/Japanese_era_name
Calendar.ja_JP_JP =
{
  get : function(field)
  {
    var value = null;
    var date = this.date;
    
    var meiji = new Date(1868, 1-1, 1);
    var taisho = new Date(1912, 7-1, 30);
    var showa = new Date(1926, 12-1, 25);
    var heisei = new Date(1989, 1-1, 8);
    var firstDayOfEras = [null, meiji, taisho, showa, heisei];
  
    switch (field)
    {
      case Calendar.ERA:
        value = 0;
        for (var i=1; i<firstDayOfEras.length; i++)
        {
          var firstDayOfEra = firstDayOfEras[i];
          if (date >= firstDayOfEra)
            value = i;
        }
        break;
      
      case Calendar.YEAR:
        var firstDay = null;
        for (var i=1; i<firstDayOfEras.length; i++)
        {
          var firstDayOfEra = firstDayOfEras[i];
          if (date >= firstDayOfEra)
            firstDay = firstDayOfEra;
        }
        value = date.getFullYear() - firstDay.getFullYear() + 1;
        break;
    }
    
    return value;
  },
  
  formatYear : function(value)
  {
    return value == 1? "\u5143": null; //formatNumber(value,"00");
  }
}

})();


(function(){
xdo.bind("xdo.i18n.SimpleDateFormat", SimpleDateFormat);
xdo.require("xdo.i18n.Calendar");
xdo.require("xdo.i18n.DateFormat");
xdo.extend(SimpleDateFormat, xdo.i18n.DateFormat);

// This class behaves just like text formatting class in Java SDK.
// See JavaDoc API for usage.
// http://java.sun.com/javase/6/docs/api/java/text/SimpleDateFormat.html
//
// It is not recommended to use constructor to instanciate this class object.
// Use xdo.i18n.DateFormat.getInstance() static methods instead.

function SimpleDateFormat(pattern, locale)
{
  pattern = pattern || "";
  xdo.require("xdo.i18n.Locale");
  locale = locale || xdo.i18n.Locale.getDefault();

  SimpleDateFormat.superclass.constructor.apply(this,[]);
  
  this.locale = locale;
  xdo.require("xdo.i18n.DateFormatSymbols");
  this.dateFormatSymbols = xdo.i18n.DateFormatSymbols.getInstance(locale);

  this.pattern = "";
  this.patternParts = [];
  this.applyPattern(pattern);
}

SimpleDateFormat.prototype.getDateFormatSymbols = function()
{
  return this.dateFormatSymbols;
}

SimpleDateFormat.prototype.setDateFormatSymbols = function(dateFormatSymbols)
{
  this.dateFormatSymbols = dateFormatSymbols;
}

SimpleDateFormat.prototype.applyPattern = function(pattern)
{
  var offset = 0;
  function nextPart()
  {
    function nextLiteral()
    {
      for (var i=offset+1; i<pattern.length; i++)
      {
        // single quotation mark is escaped by two single quotation mark. (e.g. "'o ''clock'" --> "o'clock")  
        if (pattern.charAt(i)=="'" && pattern.charAt(i+1)=="'")
        {
          i++;
          continue;
        }
  
        if (pattern.charAt(i)=="'")
        {
          i++;
          break;
        }
      }
      var part = pattern.substring(offset, i);
      offset = i;
      return part;
    }

    if (pattern=='')
      return null;

    if (pattern.charAt(offset)=="'")
      return nextLiteral();

    var targetChar = pattern.charAt(offset);
    for (var i=offset+1; i<pattern.length; i++)
    {
      if (pattern.charAt(i)!=targetChar)
        break;
    }
    var part = pattern.substring(offset, i);
    offset = i;
    return part;
  }

  var parts = [];
  while (true)
  {
    var part = nextPart();
    if (!part)
      break;
    parts.push(part);
  }

  this.pattern = pattern;
  this.patternParts = parts;
}

SimpleDateFormat.prototype.format = function(date)
{
  var locale = this.locale;
  var cal = new xdo.i18n.Calendar(locale, date);
  
  function formatText(value, pattern, fullForms, shortForms)
  {
    if (pattern.length<4 && shortForms)
      return shortForms[value] || value;

    return fullForms[value] || value;
  }

  function formatNumber(value, pattern)
  {
    xdo.require("xdo.i18n.NumberFormat");
    var formatter = xdo.i18n.NumberFormat.getIntegerInstance(locale);
    formatter.setMinimumIntegerDigits(pattern.length);
    formatter.setGroupingUsed(false);
    return formatter.format(value);
  }

  function formatMonth(value, pattern)
  {
    if (pattern.length>=3)
      return formatText(value-1,pattern,dfs.getMonths(),dfs.getShortMonths());
    else
      return formatNumber(value,pattern);
  }
  
  function formatYear(value, pattern)
  {
    // special handling for Japanese imperial year.
    // http://en.wikipedia.org/wiki/Japanese_era_name
    // http://itpro.nikkeibp.co.jp/article/COLUMN/20071102/286274/
    if (locale.getLanguage()=='ja' && locale.getCountry()=='JP' && locale.getVariant()=='JP')
    {
      if (pattern.length==1)
        return formatNumber(value,"0");
      if (pattern.length==4)
        return value == 1? "\u5143": formatNumber(value,"0");
    }
    
    if (pattern.length==1)
      return formatNumber(value%100,"00");

    if (pattern.length==2)
      return formatNumber(value%100,pattern);
    
    return formatNumber(value,pattern);
  }

  function formatGeneralTimezone(value, pattern)
  {
    var sign = value>=0? '-': '+'; // minus means timezone ahead of GMT.
    var hour = parseInt(value/(60*60*1000));
    var minute = parseInt(value/(60*1000)%60);
    hour = hour<10? '0'+hour: ''+hour;
    minute = minute<10? '0'+minute: ''+minute;
    
    return 'GMT' + sign + hour + ':' + minute;
  }
  
  function formatRFC822Timezone(value, pattern)
  {
    var sign = value>=0? '-': '+'; // minus means timezone ahead of GMT.
    var hour = parseInt(value/(60*60*1000));
    var minute = parseInt(value/(60*1000)%60);
    hour = hour<10? '0'+hour: ''+hour;
    minute = minute<10? '0'+minute: ''+minute;

    return sign + hour + minute;
  }
  
  var dfs = this.getDateFormatSymbols();
  function formatPart(pattern, value)
  {
    switch (pattern.charAt(0))
    {
      case 'G':
        var era = cal.get(xdo.i18n.Calendar.ERA);
        var fullForms = dfs.getEras();
        var shortForms = dfs.getShortEras();
        return formatText(era,pattern,fullForms,shortForms);

      case 'y':
        var year = cal.get(xdo.i18n.Calendar.YEAR);
        return formatYear(year,pattern);

      case 'M':
        var month = cal.get(xdo.i18n.Calendar.MONTH) + 1;
        return formatMonth(month,pattern);

      case 'w':
        var weekInYear = cal.get(xdo.i18n.Calendar.WEEK_IN_YEAR);
        return formatNumber(weekInYear,pattern);

      case 'W':
        var weekInMonth = cal.get(xdo.i18n.Calendar.WEEK_IN_MONTH);
        return formatNumber(weekInMonth,pattern);

      case 'D':
        var dayInYear = cal.get(xdo.i18n.Calendar.DAY_IN_YEAR);
        return formatNumber(dayInYear,pattern);

      case 'd':
        var date = cal.get(xdo.i18n.Calendar.DATE);
        return formatNumber(date,pattern);

      case 'F':
        var dayOfWeekInMonth = cal.get(xdo.i18n.Calendar.DAY_OF_WEEK_IN_MONTH);
        return formatNumber(dayOfWeekInMonth,pattern);

      case 'E':
        var dayInWeek = cal.get(xdo.i18n.Calendar.DAY_OF_WEEK);
        return formatText(dayInWeek,pattern,dfs.getWeekdays(),dfs.getShortWeekdays());

      case 'a':
        var amPmMarker = cal.get(xdo.i18n.Calendar.AM_PM);
        return formatText(amPmMarker,pattern,dfs.getAmPmStrings());

      case 'H':
        var hourInDay_0_23 = cal.get(xdo.i18n.Calendar.HOUR_OF_DAY);
        return formatNumber(hourInDay_0_23,pattern);

      case 'k':
        var hourInDay_1_24 = cal.get(xdo.i18n.Calendar.HOUR_OF_DAY) + 1;
        return formatNumber(hourInDay_1_24,pattern);

      case 'K':
        var hourInAmPm_0_11 = cal.get(xdo.i18n.Calendar.HOUR);
        return formatNumber(hourInAmPm_0_11,pattern);

      case 'h':
        var hourInAmPm_1_12 = cal.get(xdo.i18n.Calendar.HOUR) || 12;
        return formatNumber(hourInAmPm_1_12,pattern);

      case 'm':
        var minuteInHour = cal.get(xdo.i18n.Calendar.MINUTE);
        return formatNumber(minuteInHour,pattern);

      case 's':
        var secondInMinute = cal.get(xdo.i18n.Calendar.SECOND);
        return formatNumber(secondInMinute,pattern);

      case 'S':
        var milliseconds = cal.get(xdo.i18n.Calendar.MILLISECOND);
        return formatNumber(milliseconds,pattern);

      case 'z':
        var timezoneOffset = cal.get(xdo.i18n.Calendar.ZONE_OFFSET);
        return formatGeneralTimezone(timezoneOffset);

      case 'Z':
        var timezoneOffset = cal.get(xdo.i18n.Calendar.ZONE_OFFSET);
        return formatRFC822Timezone(timezoneOffset);

      case '\'':
        var literal = pattern;
        if (literal=="''")
          literal = "''''";
        literal = literal.substring(1,literal.length-1); // remove first and last single quotation.
        literal = literal.replace("''", "'"); // unescape single quotation char.
        return literal;

      default:
        return pattern;
    }
  }

  var str = "";  
  for (var i=0; i<this.patternParts.length; i++)
  {
    var patternPart = this.patternParts[i];
    str += formatPart(patternPart, date);
  }
  return str;
}

SimpleDateFormat.prototype.toPattern = function()
{
  return this.pattern;
}

SimpleDateFormat.prototype.clone = function()
{
  var pattern = this.toPattern();
  var locale = this.locale.clone();
  return new SimpleDateFormat(pattern,locale);
}

})();


(function(){
/**
 *  @class
 * DataFormatter provides static APIs for data formatting
 * 
 */
xdo.require("xdo.i18n.Locale");
xdo.require("xdo.i18n.DateFormat");
xdo.require("xdo.i18n.FormatUtil");
xdo.require("xdo.i18n.dataformatter.MicrosoftNumberFormatter");
xdo.require("xdo.i18n.dataformatter.MicrosoftDateFormatter");
xdo.require("xdo.i18n.OracleDateFormat");
xdo.require("xdo.i18n.SimpleDateFormat");
xdo.bind("xdo.i18n.dataformatter.DataFormatter", DataFormatter);

function DataFormatter() {
}

/**
 * @public Data Format API
 * @param {String} value
 * @param {String} formatStyle
 * @param {String} formatMask
 * @param {String} dataType - either 
 * @param {xdo.i18n.Locale} locale
 * @returns {String} formatted value
 */
DataFormatter.format = function(value, formatStyle, formatMask, dataType, locale) {
  if (dataType === "number"){
     value = DataFormatter.formatNumber(value, formatStyle, formatMask, locale); 
  } else if (dataType === "date") {
     if(typeof value == "string") {
        value = new Date(value);
     }
     value = DataFormatter.formatDate(value, formatStyle, formatMask, locale);
  }   
  return value;
};
/**
 * @public Number Format API
 * @param {String} value
 * @param {String} formatStyle
 * @param {String} formatMask
 * @param {xdo.i18n.Locale} locale
 * @return {String} formatted value
 * 
 */
DataFormatter.formatNumber = function(value, formatStyle, formatMask, locale){
    if(isNaN(value)) {
       return value;
   }
   var formatter = DataFormatter.getNumberFormatter(formatStyle, formatMask, locale);
   if(formatter) {
      value = formatter.format(value);
   }
   // no formatting for Oracle number format for now..
   return value;
};

/**
 * @public Date Format API
 * @param {String} value
 * @param {String} formatStyle
 * @param {String} formatMask
 * @param {xdo.i18n.Locale}
 * @returns {String} formatted value
 */
DataFormatter.formatDate = function(value, formatStyle, formatMask, locale){
   var formatter = DataFormatter.getDateFormatter(formatStyle, formatMask, locale);
   var newValue = null;
   if(formatter) {
      if(typeof value == "string") {
         value = new Date(value);
      }
      newValue = formatter.format(value);
   }
   return newValue? newValue : value;
};

/**
 * Return data formatter for rendering HTML based on DataQueryResponse
 * @param {String} formatStyle
 * @param {String} formatMask
 * @param {String} value
 * @param {xdo.i18n.Locale} locale
 * @return {xdo.i18n.dataformatter.AbstractDataFormatter} data formatter
 * @public
 */
DataFormatter.getNumberFormatter = function(formatStyle, formatMask, locale){
    if (!formatStyle || formatStyle === ""){ 
      formatStyle = "ms";
    }
    if (!formatMask || formatStyle === "") {
      formatMask = "#,##0.00";
    }
    var instance, formatter = null;
    if(formatStyle === 'ms'){// only support ms as discussed with BIMAD dev team..
      instance = xdo.i18n.dataformatter.MicrosoftNumberFormatter.createInstance(formatMask,locale);
      formatter = instance.formatter;
    }
    return formatter;
};

/**
 * Return data formatter for rendering HTML based on DataQueryResponse
 * @param {String} formatStyle
 * @param {String} formatMask
 * @param {String} value
 * @param {xdo.i18n.Locale} locale
 * @return {Object} data formatter
 * @private
 */
DataFormatter.getDateFormatter = function(formatStyle, formatMask, locale){
    
    var formatter = null;
    if(formatStyle === "oracle"){ // covert Oracle Abstract format to ms one..
      formatter = DataFormatter.converOracleToMSDateFormat(locale, formatMask);
    } else { //for ms, we will convert format mask to Java one and format with SimpleDateFormat
      var javaMask = xdo.i18n.FormatUtil.ms2javaDateFormatMask(formatMask);
      formatter = new xdo.i18n.SimpleDateFormat(javaMask,locale);
    }
    return formatter;
};
/**
 * @public
 * @param {xdo.i18n.Locale} locale
 * @param {String} formatMask - Abstract Oracle Format
 * @returns {DateFormat} date format object
 */
DataFormatter.convertOracleToMSDateFormat = function (locale, formatMask) {
    var getInstance = xdo.i18n.DateFormat.getDateTimeInstance;
    //dateStyle, timeStyle, locale
    var fmt = null;
    switch (formatMask) {
      case "SHORT":
        fmt = getInstance(xdo.i18n.DateFormat.SHORT, -1, locale);
        break;
      case "MEDIUM":
        //almost no difference between LONG and MEDIUM so use LONG here.
        fmt = getInstance(xdo.i18n.DateFormat.LONG, -1, locale); 
        break;
      case "LONG":
        // need day of week so use FULL instead of LONG
        fmt = getInstance(xdo.i18n.DateFormat.FULL, -1, locale);
        break;
      case "SHORT_TIME":
        fmt = getInstance(xdo.i18n.DateFormat.SHORT, xdo.i18n.DateFormat.SHORT, locale);
        break;
      case "MEDIUM_TIME":
        //almost no difference between LONG and MEDIUM
        fmt = getInstance(xdo.i18n.DateFormat.LONG, xdo.i18n.DateFormat.MEDIUM, locale);
        break;
      case "LONG_TIME":
        // need day of week so use FULL instead of LONG
        fmt =  getInstance(xdo.i18n.DateFormat.FULL, xdo.i18n.DateFormat.LONG, locale);
        break;
      case "SHORT_TIME_TZ":
        fmt = getInstance(locale, xdo.i18n.DateFormat.SHORT, xdo.i18n.DateFormat.SHORT);
        var fmtMask = fmt.toPattern() + " zzz";
        fmt = new xdo.i18n.SimpleDateFormat(fmtMask, locale);
        break;
      case "MEDIUM_TIME_TZ":
        fmt = getInstance(locale, xdo.i18n.DateFormat.LONG, xdo.i18n.DateFormat.MEDIUM);
        var fmtMask = fmt.toPattern() + " zzz";
        fmt = new xdo.i18n.SimpleDateFormat(fmtMask, locale);
        break;
      case "LONG_TIME_TZ":
        fmt = getInstance(locale, xdo.i18n.DateFormat.FULL, xdo.i18n.DateFormat.LONG);
        var fmtMask = fmt.toPattern() + " zzz";
        fmt = new xdo.i18n.SimpleDateFormat(fmtMask, locale);
        break;
      default:
        // cannot support oracle custom date format..
        // fallback to short date..
        fmt = getInstance(xdo.i18n.DateFormat.SHORT, -1, locale);
    }
    return fmt;
};


})();


(function(){
/**
 * Length.js
 */
xdo.bind("xdo.lang.Length", Length);

/**
 * Length object. 
 * 
 * You can create the length object in 2 ways. 
 * <ul>
 * <li>Passing length value and length unit like <code>new Length(5, 'px');</code></li>
 * <li>Passing length string like <code>new Length('5px');</code></li>
 * </ul>
 * 
 * @constructor
 * @param {String} length value
 * @param {String} length unit. 'px', 'cm', 'in', or 'pt'.
 */
function Length(value, unit)
{
  value = value!=undefined? value: 0;
  unit = unit!=undefined? unit: 'px';

  this.value = value;
  this.unit = unit;
}

/**
 * Returns the value.
 */
Length.prototype.getValue = function(unit)
{
  return this.value;
}

Length.prototype.getUnit = function()
{
  return this.unit;
}

Length.prototype.toUnit = function(unit)
{
  function round(num,precision)
  { 
    var v = Math.round(num/precision)*precision;
    // Avoid rounding non-zero value to zero here. 
    return (num != 0 && v == 0) ? precision : v;
  }
  
  var fromUnit = Length.unitList[this.unit];
  var toUnit = Length.unitList[unit];
  var value = this.value * fromUnit.pxRatio / toUnit.pxRatio;
  value = parseFloat(round(value, Math.pow(10,toUnit.fractionDigits*(-1))).toFixed(toUnit.fractionDigits));
  return new Length(value,unit);
}

Length.prototype.toString = function()
{
  return this.value + this.unit;
}

Length.prototype.toLocaleString = function()
{
  var unitInfo = Length.unitList[this.unit];

  xdo.require('xdo.i18n.NumberFormat');
  var fmt = xdo.i18n.NumberFormat.getInstance();
  fmt.setMinimumFractionDigits(unitInfo.fractionDigits);
  fmt.setMaximumFractionDigits(unitInfo.fractionDigits);
  var lenStr = fmt.format(this.value);
  
  return lenStr + unitInfo.label;
}

Length.parse = function(str)
{
  for (var key in Length.unitList)
  {
    var unit = Length.unitList[key];
    var suffix = unit.value;

    xdo.require('xdo.i18n.NumberFormat');
    var fmt = xdo.i18n.NumberFormat.getInstance();
    fmt.setPositiveSuffix(suffix);
    fmt.setNegativeSuffix(suffix);
    var value = fmt.parse(str);
    if (value!=null)
      return new Length(value,unit.value);
  }
  
  return null;
}


Length.createInstance = function(str)
{
  for (var key in Length.unitList)
  {
    var unit = Length.unitList[key];
    var suffix = unit.value;

    xdo.require('xdo.i18n.Locale');
    xdo.require('xdo.i18n.NumberFormat');
    var fmt = xdo.i18n.NumberFormat.getInstance(xdo.i18n.Locale.ENGLISH);
    fmt.setPositiveSuffix(suffix);
    fmt.setNegativeSuffix(suffix);
    var value = fmt.parse(str);
    if (value!=null)
      return new Length(value,unit.value);
  }
  
  return null;
}


/**
 * Returns the pixel value.
 * @param {Object} str
 */
Length.getPixelValue = function(str)
{
  var length = Length.createInstance(str);
  return length? length.toUnit('px').getValue(): -1;
}


Length.prototype.getPixelValue = function()
{
  return Length.getPixelValue(this.toString());
}




Length.unitList = {};
Length.unitList["px"] = {value:'px', label:xdo.getMessage("OptionValue.LengthUnit.px"),  pxRatio: 1,      fractionDigits: 0};
Length.unitList["pt"] = {value:'pt', label:xdo.getMessage("OptionValue.LengthUnit.pt"),  pxRatio: (96/72),  fractionDigits: 1}; // 1px = 0.75pt in 96dpi system
Length.unitList["in"] = {value:'in', label:xdo.getMessage("OptionValue.LengthUnit.inch"),pxRatio: 96,     fractionDigits: 2};    // 1in = 72pt
Length.unitList["cm"] = {value:'cm', label:xdo.getMessage("OptionValue.LengthUnit.cm"),  pxRatio: (96/2.54), fractionDigits: 2};// 1in = 2.54cm

Length.unitArray = [
  Length.unitList["px"],
  Length.unitList["pt"],
  Length.unitList["in"],
  Length.unitList["cm"]
];

Length.unitArrayForFontSize = [Length.unitList["pt"]];
 
/**
 * 
 * @static
 */  
Length.getAvailableUnits = function()
{
  return Length.unitArray;
}
/**
 * 
 * @static
 */  
Length.getAvailableUnitsForFontSize = function()
{
  return Length.unitArrayForFontSize;
}

/**
 * Returns the unit id (such as 'px', 'in') from the unit label 
 * (such as 'pixel', 'inch'). If no matching unit id found, 
 * it returns the label value as is.
 * 
 * @static
 */
Length.getUnitIdFromLabel = function(label)
{
  for (var i=0, j=Length.unitArray; i<j.length; i++)
  {
    if (j[i].label == label)
    {
      return j[i].value;
    }
  }
  return label;
}




})();


xdo._debug = false;

xdo.release = true;
