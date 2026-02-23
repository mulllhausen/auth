firebase-auth offers the option to save the user in a google-managed identity
store. the choice of whether to do this depends on many things:

1. it is less secure. there are string fields which are not validated (eg.
   photoURL) and these can be set from the GUI (`updateProfile()`). it would be
   nice if i could write validation rules, like i can with google cloud
   firestore. but no, the internals are not exposed to developers.

1. it is not extensible. if i want to add more fields, i cannot. potentially i
   could just convert everything to json and stick it in a string field. but
   that's ugly.

1. data can be overwritten. for example if you first log in with google this
   will set one photoURL but then if you log in with facebook it will be
   overwritten. of course there is a way around this - save it in a variable and
   restore the one you want. but that's a workaround.

1. some service providers (facebook) do not return the profile picture URL
   without an extra fetch. it is not possible to save this under the facebook
   photoURL in the firebase user object, which is annoying. i want to store it
   and offer it as an option for my users to choose. but firebase offers no way
   to do that.

using google cloud firestore to store the user object offers a lot of
advantages.

1. i can validate the photo URL with rules for better security

1. i can extend the user object

the downside is that it takes an extra fetch. but still ... with a SPA that can
be 1 fetch for the entire session, so long as the user object is not updated.

should i keep profile picture URLs around? what if the user wants them gone?
maybe have a warning: "all these URLs are publicly accessible, if you want to
get rid of one then make it private via facebook/google"
