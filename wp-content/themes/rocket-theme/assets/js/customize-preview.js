/**
 * Rocket Design — Customizer live preview.
 *
 * Colour controls use postMessage transport: instead of reloading the preview,
 * we write the chosen value straight onto the <html> element as an inline CSS
 * custom property, which overrides the stylesheet :root{} declaration. Clearing
 * a control removes the inline value, falling back to the skin/default colour.
 */
( function () {
	if ( typeof wp === 'undefined' || ! wp.customize ) {
		return;
	}

	var tokens = [ '--color-accent', '--color-bg', '--color-heading', '--color-header-bg' ];

	tokens.forEach( function ( token ) {
		wp.customize( 'rt_design_tokens[' + token + ']', function ( setting ) {
			setting.bind( function ( value ) {
				if ( value ) {
					document.documentElement.style.setProperty( token, value );
				} else {
					document.documentElement.style.removeProperty( token );
				}
			} );
		} );
	} );
} )();
