
//-----------------------------------------------------------------
// Location.js
//-----------------------------------------------------------------
if (xdo && xdo.i18n && xdo.i18n.Locale) {
  xdo.i18n.Locale.register('en_US', 'English (United States)', 'English', 'United States', '');
}


//-----------------------------------------------------------------
// NumberFormat.js
//-----------------------------------------------------------------
if (xdo && xdo.i18n && xdo.i18n.NumberFormat) {
  xdo.i18n.NumberFormat.register('en_US', 'default', '#,##0.###');
  xdo.i18n.NumberFormat.register('en_US', 'integer', '#,##0');
  xdo.i18n.NumberFormat.register('en_US', 'percent', '#,##0%');
  xdo.i18n.NumberFormat.register('en_US', 'currency', '¤#,##0.00;(¤#,##0.00)');

}


//-----------------------------------------------------------------
// DecimalFormatSymbols.js
//-----------------------------------------------------------------
if (xdo && xdo.i18n && xdo.i18n && xdo.i18n.DecimalFormatSymbols) {
  var symbols = [];
  symbols.push('$');
  symbols.push('.');
  symbols.push('#');
  symbols.push('E');
  symbols.push(',');
  symbols.push('∞');
  symbols.push('USD');
  symbols.push('-');
  symbols.push('.');
  symbols.push('�');
  symbols.push(';');
  symbols.push('%');
  symbols.push('‰');
  symbols.push('0');
  xdo.i18n.DecimalFormatSymbols.register('en_US', symbols);
}


//-----------------------------------------------------------------
// DateFormat.js
//-----------------------------------------------------------------
if (xdo && xdo.i18n && xdo.i18n.DateFormat) {
  xdo.i18n.DateFormat.register('en_US', '0', '0', 'EEEE, MMMM d, yyyy h:mm:ss a z');
  xdo.i18n.DateFormat.register('en_US', '0', '1', 'EEEE, MMMM d, yyyy h:mm:ss a z');
  xdo.i18n.DateFormat.register('en_US', '0', '2', 'EEEE, MMMM d, yyyy h:mm:ss a');
  xdo.i18n.DateFormat.register('en_US', '0', '3', 'EEEE, MMMM d, yyyy h:mm a');
  xdo.i18n.DateFormat.register('en_US', '0', '-1', 'EEEE, MMMM d, yyyy');
  xdo.i18n.DateFormat.register('en_US', '1', '0', 'MMMM d, yyyy h:mm:ss a z');
  xdo.i18n.DateFormat.register('en_US', '1', '1', 'MMMM d, yyyy h:mm:ss a z');
  xdo.i18n.DateFormat.register('en_US', '1', '2', 'MMMM d, yyyy h:mm:ss a');
  xdo.i18n.DateFormat.register('en_US', '1', '3', 'MMMM d, yyyy h:mm a');
  xdo.i18n.DateFormat.register('en_US', '1', '-1', 'MMMM d, yyyy');
  xdo.i18n.DateFormat.register('en_US', '2', '0', 'MMM d, yyyy h:mm:ss a z');
  xdo.i18n.DateFormat.register('en_US', '2', '1', 'MMM d, yyyy h:mm:ss a z');
  xdo.i18n.DateFormat.register('en_US', '2', '2', 'MMM d, yyyy h:mm:ss a');
  xdo.i18n.DateFormat.register('en_US', '2', '3', 'MMM d, yyyy h:mm a');
  xdo.i18n.DateFormat.register('en_US', '2', '-1', 'MMM d, yyyy');
  xdo.i18n.DateFormat.register('en_US', '3', '0', 'M/d/yy h:mm:ss a z');
  xdo.i18n.DateFormat.register('en_US', '3', '1', 'M/d/yy h:mm:ss a z');
  xdo.i18n.DateFormat.register('en_US', '3', '2', 'M/d/yy h:mm:ss a');
  xdo.i18n.DateFormat.register('en_US', '3', '3', 'M/d/yy h:mm a');
  xdo.i18n.DateFormat.register('en_US', '3', '-1', 'M/d/yy');
  xdo.i18n.DateFormat.register('en_US', '-1', '0', 'h:mm:ss a z');
  xdo.i18n.DateFormat.register('en_US', '-1', '1', 'h:mm:ss a z');
  xdo.i18n.DateFormat.register('en_US', '-1', '2', 'h:mm:ss a');
  xdo.i18n.DateFormat.register('en_US', '-1', '3', 'h:mm a');

}


//-----------------------------------------------------------------
// DateFormatSymbols.js
//-----------------------------------------------------------------
if (xdo && xdo.i18n && xdo.i18n.DateFormatSymbols) {
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
  xdo.i18n.DateFormatSymbols.register('en_US', symbols);
}
