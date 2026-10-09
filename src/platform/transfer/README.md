# Transfer Ownership

`MaterialUpload` owns single-dispatch, session-bound XHR upload transport. The
session controller owns the request lease, fresh CSRF and security epoch. Transfer
teardown runs before protected cache purge. The route owns the ephemeral serialized
queue and never infers an unknown attempt's identity from server metadata.

Original response bytes pass through the existing JSON:API decoder; no second
request or parse/stringify adapter is used. Upload progress comes only from XHR
events. Stopping a wait does not prove cancellation of a server commit.

Downloads, object URLs and authorized inline images remain deferred.
