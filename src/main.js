// import m from "mathjs";
// import { nm, nmAsync, nmCallback, nmGen, nmAsyncGen } from "./nm.js";
// import { memorize, nMemorize } from "./plain-memorize.js";
const m = require( "mathjs" );
const { nm, nmAsync, nmCallback, nmGen, nmAsyncGen } = require( "./nm.js" );
const { memorize, nMemorize } = require( "./plain-memorize.js" );

function* range( start, stop, step = 1 ) {
	if ( arguments.length == 1 ) {
		stop = start;
		start = 0;
	}

	for ( let i = start; i < stop; i += step ) {
		yield i;
	}
};

const visibleStr = str =>
	str
		.replace( /\x08/g, "\\b" )
		.replace( /\f/g, "\\f" )
		.replace( /\n/g, "\\n" )
		.replace( /\r/g, "\\r" )
		.replace( /\t/g, "\\t" )
		.replace( /\v/g, "\\v" );

const vertex2str = vertex =>
	vertex.map( scalar => String.fromCharCode( Math.round( scalar ) ) ).join( "" );

const str2vertex = str =>
	str.split( /(?:)/g ).map( c => c.charCodeAt( 0 ) );

const randomVertex = () =>
	Array.from( range( target.length ) )
		.map( idx => Math.floor( Math.random() * 0x0100 ) );

const lose = memorize( vertex => {
	let ret = m.subtract( vertex, target ).reduce(( loss, diff ) =>
		loss + Math.pow( diff, 2 ), 0 );

	console.log( `Vertex ${ visibleStr( vertex2str( vertex ) ) } loses ${ ret }` );

	return ret;
} );

const loseAsync = memorize( vertex => {
	let ret = m.subtract( vertex, target ).reduce(( loss, diff ) =>
		loss + Math.pow( diff, 2 ), 0 );

	console.log( `Vertex ${ visibleStr( vertex2str( vertex ) ) } loses ${ ret }` );

	return Promise.resolve( ret );
} );

const loseCallback = nMemorize(( vertex, callback ) => {
	let ret = m.subtract( vertex, target ).reduce(( loss, diff ) =>
		loss + Math.pow( diff, 2 ), 0 );

	console.log( `Vertex ${ visibleStr( vertex2str( vertex ) ) } loses ${ ret }` );

	callback( null, ret );
} );

const targetStr = "hello World!";
const target = str2vertex( targetStr );

let vertices = Array.from( range( target.length + 1 ) ).map(() => randomVertex() );

let main = () => {
	for ( let iteration = 0; iteration < 1e5; iteration += 1 ) {
		vertices = nm( vertices, lose );

		if ( vertices.find( vertex => vertex2str( vertex ) === targetStr ) ) {
			break;
		}
	}
};

let mainAsync = async () => {
	for ( let iteration = 0; iteration < 1e5; iteration += 1 ) {
		vertices = await nmAsync( vertices, loseAsync );

		if ( vertices.find( vertex => vertex2str( vertex ) === targetStr ) ) {
			break;
		}
	}
};

let mainCallback = () => {
	let iteration = 0;

	( function loop() {
		nmCallback( vertices, loseCallback, ( error, _vertices ) => {
			iteration += 1;

			if ( error ) {
				console.error( error );
			} else if ( vertices.find( vertex => vertex2str( vertex ) === targetStr ) ) {
				// break the recursion
			} else if ( iteration < 1e5 ) {
				vertices = _vertices;
				setImmediate( loop );
			}
		} );
	} )();
};

let mainGen = () => {
	let iteration = 0;

	for ( let _vertices of nmGen( vertices, lose ) ) {
		iteration += 1;

		if ( iteration >= 1e5 ) {
			break;
		} else if ( _vertices.find( vertex => vertex2str( vertex ) === targetStr ) ) {
			break;
		}
	}
}

/*
let mainAsyncGen = () => {
	let iteration = 0;

	for await ( let _vertices of nmAsyncGen( vertices, loseAsync ) ) {
		iteration += 1;

		if ( iteration >= 1e5 ) {
			break;
		} else if ( _vertices.find( vertex => vertex2str( vertex ) === targetStr ) ) {
			break;
		}
	}
}
*/

main();