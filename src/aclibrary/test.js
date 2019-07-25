//em++ aclibrary.cpp -s EXPORTED_FUNCTIONS="['_genpwdhash']" -s EXTRA_EXPORTED_RUNTIME_METHODS='["ccall", "cwrap"]' -o aclibrary.js

const Module = require('./aclibrary.js');

Module.onRuntimeInitialized = function() {
	genpwdhash = Module.cwrap('genpwdhash', 'string', ['string', 'string', 'number']);
	console.log('Value', genpwdhash('Burak', 'password2', 10));
}