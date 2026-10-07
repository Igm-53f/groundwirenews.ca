( function( $ ) {
	$( document ).ready( function() {
		if ( gglcptchSource.disable_view_source == 1 ) {
			document.addEventListener( 'contextmenu', event => event.preventDefault() );
			document.onkeydown = function( e ) {
				/* F12 key */
				if( e.keyCode == 123 ) {
					return false;
				}
				/* Ctrl+U (View Source) */
				if( e.ctrlKey && e.keyCode == 'U'.charCodeAt(0) ) {
					return false;
				}
				/* Ctrl+Shift+I (Inspect Element) */
				if( e.ctrlKey && e.shiftKey && e.keyCode == 'I'.charCodeAt(0) ) {
					return false;
				}
			};
		}
	} );
} )( jQuery );