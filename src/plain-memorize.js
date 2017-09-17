
/**
 * make a function cache its return value
 * @param {function} fn
 */
function memorize( fn ) {
	let returns = new Map(), throws = new Map();;

	function memorized() {
		let argsKey = JSON.stringify( arguments );

		if ( throws.has( argsKey ) ) {
			throw throws.get( argsKey );
		} else if ( returns.has( argsKey ) ) {
			return returns.get( argsKey );
		} else {
			let ret;

			try {
				ret = fn( ...arguments );
			} catch ( error ) {
				throws.set( argsKey, error );

				throw error;
			}

			returns.set( argsKey, ret );

			return ret;
		}

		
	}

	memorized.refresh = function refresh() {
		returns.clear();
	}

	return memorized;
};

/**
 * make function with a node-style callback cache its return value
 * @param {function} fn
 */
function nMemorize( fn ) {
	let returns = new Map(), throws = new Map();

	function memorized() {
		let args = [ ...arguments ], callback;

		if ( "function" === typeof args[ args.length - 1 ] ) {
			callback = args.pop();
		} else {
			callback = function () { };
		}

		let argsKey = JSON.stringify( args ),
			ret = returns.get( argsKey )

		if ( throws.has( argsKey ) ) {
			callback( throws.get( argsKey ), null );
		} else if ( returns.has( argsKey ) ) {
			callback( null, returns.get( argsKey ) );
		} else {
			fn( ...args, function ( error, result ) {
				if ( error ) {
					throws.set( argsKey, error );
					callback( error, null );
				} else {
					returns.set( argsKey, result );
					callback( null, result );
				}
			} );
		}
	}

	memorized.refresh = function refresh() {
		returns.clear();
		throws.clear();
	}

	return memorized;
};

// export { memorize, nMemorize };
module.exports = { memorize, nMemorize };
