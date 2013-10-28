lies.js
==============
Because, sometimes, you have no intention of keeping that promise.

(this lib is not yet fully baked, but is very close... stay tuned)

About
-----

    "We must not promise what we ought not, lest we be called on to perform what we cannot."
    -Abraham Lincoln

This library springs directly out of a problem Promises/Deferreds created a problem at work, we wanted to chain promises without termination should an error occur, essentially the libraries concept of failure was different than our own. This made me realize how limited promises were (as an error is inextricably tied to failure, and the only solution is nesting another deferred, which is way more indirect than 'callback hell')

But as we were talking I realized if you had a generalized textual state machine you can attach events to certain configurations, in some cases to change state, in others to provide a terminal condition, all without spewing new promises all over memory, and what's better you could rewind states (like if you wanted to retry a specific action, or perhaps there was an incremental error and you want to back up many states), or in our case modify the success condition to ignore failures, or a percentage of fails, or fails a certain tasks... really anything. Suddenly the promises interface and underlying state mechanics(though not the spec) seemed extremely powerful.

But none of the existing promise implementations are built this way.

Covenant Usage
--------------

    "The man who promises everything is sure to fulfill nothing, and everyone who promises too much is in danger of using evil means in order to carry out his promises, and is already on the road to perdition."
    -Carl Jung
    
So the simple case of this statemachine is a rough (eventually exact, via a 'strict' mode) implementation of [Promises/A](http://wiki.commonjs.org/wiki/Promises/A)

    var promise = require('lies').covenant;

much like you may have seen:

    new promise().then(function(){
        return 'something';
    }).then(function(phrase){
        return phrase+' wicked';
    }).then(function(phrase){
        return phrase+' this';
    }).then(function(phrase){
        return phrase+' way'
    }).then(function(phrase){
        outputToUser(phrase+' comes!')
    }, function(error){
        //handle error
    });

or from the spec

    asyncComputeTheAnswerToEverything()
    .then(addTwo)
    .then(printResult, onError);

but unlike you may have seen, you can use this promise like a deferred and just pass promises in instead of handlers:

    new promise()
    .then($.ajax(options))
    .then(function(results){
        renderElement(results);
    }, function(error){
        showError(error);
    });

Lies Usage
----------

    "The promise given was a necessity of the past:  the word broken is a necessity of the present."
    -Niccolo Machiavelli
    
Lies are very simply textual state machines which allow you to attach transitions and logic to particular states. The Covenant is simply a particular usage of a lie, conforming to [promises/A](http://wiki.commonjs.org/wiki/Promises/A) and integrating (rather than externalizing) deferreds. 

(todo)

Background
----------

    "The woods are lovely, dark and deep. But I have promises to keep, and miles to go before I sleep.
    -Robert Frost

After much discussion, thought and code perusal, I think promises/deferreds are over hyped bullshit that solve next to nothing. 

They are:

1) State machines that are only capable of moving in 1 direction
2) functional compositions which have indeterminate returns
3) claim to solve callback nesting hell, but actually exchange a callback which executes as a byproduct of the task to one which must be called by you when the unrewindable state machine terminates.
4) internally you have a ton of nested callbacks, so from a performance standpoint there is no gain
5) have no concept of partial error, then succeed

Conventional wisdom from other languages is that exception handling is needlessly, node's error passing paradigm was ever an issue for me... frankly I feel errors should be trapped within a level or two and *always* from within the module they originate in. From that perspective I gain nothing. I still have to manually transfer an error event across any scope/event return boundary, so really all I got is that chained callbacks can all throw to the same block. That's literally the only feature I got from *all* that indirection.

The insidious thing is that it requires *every* async activity to be implemented as a promise in order for this to be useful. Let's recode everything!! Yay!! It will infect every return of every call... which is great for guys who like metalanguages built on top of JS, but pretty terrible for those of us who like JS for what it *is*.

When people describe how great promises are, I seriously question their sanity and/or their code.

Let's illustrate with some examples, direct from [Domenic](http://domenic.me/)'s [promises spec rant](https://gist.github.com/domenic/3889970) about [the POWER!!!](http://www.youtube.com/watch?v=Wh7B6FA4OYY) that promises represent.

    function dontGiveUp(f) {
        return f().then(
            undefined, // pass through success
            function (err) {
                if (err instanceof TemporaryNetworkError) {
                    return dontGiveUp(f); // recurse
                }
                throw err; // rethrow
            }
        });
    }
 
    // Analogous synchronous code:
    function dontGiveUpSync(fSync) {
        try {
            return fSync();
        } catch (err) {
            if (err instanceof TemporaryNetworkError) {
                return dontGiveUpSync(fSync);
            }
            throw err;
        }
    }
    
OK, so let's compare this to the standard JS styles
    
    // no libraries, node error style:
    function dontGiveUp(f, callback) {
        f(err, function(){
            if(err && err instanceof TemporaryNetworkError)){
                return dontGiveUp(f, callback);
            }else callback(err);
        });
    }
    
    // no libraries, throw style:
    function dontGiveUp(f, callback, thrower) {
        //we could also implement this in the parent closure, so we didn't have to pass it as an arg
        var thrower = thrower || function(ex){ throw(ex); }
        f(err, function(){
            if(err && err instanceof TemporaryNetworkError)){
                dontGiveUp(f, callback, thrower);
                thrower(err);
            }else callback(err)
        });
    }
    
So, I don't really like this example, because it's something stupid that I would *never* implement this way in the real world, but I want to compare apples to apples, so there you go (listed as an elegant [example](https://gist.github.com/domenic/2936696) of the power of promises). In this example all we've gained is indirection through a library and the ability to simply translate seemingly imperative statements in metalanguages. Let's try something a little more 'real world':

(todo)

If you want flow control, just use [async](https://npmjs.org/package/async) or (shameless plug) [async-arrays](https://npmjs.org/package/async-arrays).

If you are an RPC guy, please go away... your own code will be your punishment for what you have done.

Not to burst everyone's bubble, but if you just use objects, who's members handle a limited depth of asynchronous callbacks, not only will your functions be short and action specific, but you can stop the indirect imperative mishmash of functions that most JS is, and promises only encourages.

Testing
-------
Currently the tests only run a primitive set of tests for conformance to the promises/A spec, there will eventually be a 'strict' (wasteful) mode which should pass the full suite of Promises/A tests. Eventually I'll implement a 3rd interface for Promises/B but it remains to be seen if Promises/A+ is worth implementing. Part of the premise of this library is that in celebrating what promises are, people have totally passed over the power of implementing them as extension of a generalized state machine.

All you have to do is run:

    mocha

A final note
------------
I'm probably being needlessly aggressive in my tone here, but it's deliberate to match those voices hailing promises as some radical new programming paradigm, rather than a clever layover from [project Xanadu](http://en.wikipedia.org/wiki/Project_Xanadu), much like the equally clever [Enfilade](http://en.wikipedia.org/wiki/Enfilade_(Xanadu). This is nothing new, but in it's current incarnation threatens to completely infect js libs and I feel like voices are needed to stem this tide of needless indirection. If you disagree, I'd love to hear about your reasoning.

Enjoy,

-Abbey Hawk Sparrow