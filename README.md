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

But none of the existing promise implementations are built this way. But before you use this, I'd like to make it clear: I don't think you should be using promises... *but* if you do, I think more expressiveness(with less complexity) can be had from a state machine based approach than an closure encapsulation approach. So in the end, use this library as a last resort when callbacks get you down.

Covenant Usage
--------------

    "The man who promises everything is sure to fulfill nothing, 
     and everyone who promises too much is in danger of using evil means in order to carry out his promises,
     and is already on the road to perdition."
    -Carl Jung
    
So the simple case of this statemachine is a rough (eventually exact, via a 'strict' mode) implementation of [promises/A](http://wiki.commonjs.org/wiki/Promises/A) and integrating (rather than externalizing) deferreds. 

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
    
Lies are very simply textual state machines which allow you to attach transitions and logic to particular states. The Covenant is simply a particular usage of a lie. You could, for instance, modify the basic covenant implementation to always resolve even if individual covenants fail:

    var passthruCovenant = function(){
        this.lie = new lies('pending');
        var lie = this.lie;
        this.calls = {};
        var calls = this.calls;
        lie.equivocate('pending', function(){ //if pending and all resolved, resolve
            if(lie.states.indexOf('pending') != -1) return false;
            else return true;
        },'resolved');
        lie.pledge('pending', function(){ //pledge to process the next item while pending
            var index;
            if((index = lie.states.indexOf('pending')) != -1){
                var rejectedIndex;
                var wasRejected = ((rejectedIndex = lie.states.indexOf('rejected')) != -1)?
                    lie.values[rejectedIndex]:
                    false;
                if(lie.states[index].when){
                    lie.states[index].lie.assess(); //make sure the inner lie is acting
                }else{
                    setTimeout(function(){
                        try{
                            if(wasRejected){
                                lie.values[index] = calls[index].error(wasRejected);
                                lie.states[index] = 'skipped'; //mark this as skipped because we error out before it
                            }else{
                                var lastResult = index-1;
                                while(lastResult > 0 && calls[lastResult].callback == undefined) lastResult--;
                                if(calls[index].callback) lie.values[index] = calls[index].callback(lie.values[lastResult]);
                                lie.states[index] = 'resolved'; //mark this as skipped because we error out before it
                            }
                        }catch(ex){
                            lie.values[index] = ex;
                            lie.states[index] = 'rejected';
                            if(calls[index].error) calls[index].error(ex);
                        }
                        lie.assess();
                    }, 0);
                }
            }//else console.log('not pending');
        });
    };
    passthruCovenant.prototype = lies.covenant.prototype;

Background
----------

    "The woods are lovely, dark and deep. But I have promises to keep, and miles to go before I sleep.
    -Robert Frost

After much discussion, thought and code perusal, I think promises/deferreds are over hyped bullshit that solve next to nothing other than mindless transformations for pseudo imperative metalanguages. 

They are:

1. State machines that are only capable of moving in 1 direction
2. functional compositions which have indeterminate returns
3. claim to solve callback nesting hell, but actually exchange a callback which executes as a byproduct of the task to one which must be called by you when the unrewindable state machine terminates.
4. internally you have a ton of nested callbacks, so from a performance standpoint there is no gain
5. have no concept of partial error, then succeed

Conventional wisdom from other languages is that exception handling is needlessly indirect and leads to non-obvious code paths, which hurts maintainability. Node's error passing paradigm was ever an issue for me (intuitive, even)... frankly I feel errors should be trapped within a level or two and *always* from within the module they originate in. From that perspective I gain nothing. I still have to manually transfer an error event across any scope/event return boundary, so really all I got is that chained callbacks can all throw to the same block. That's literally the only feature I got from *all* that indirection.

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
    
So, I don't really like this example, because it's something pointless that I would *never* implement this way in the real world, but I want to compare apples to apples, so there you go (listed as an elegant [example](https://gist.github.com/domenic/2936696) of the power of promises). In this example all we've gained is indirection through a library and the ability to simply translate seemingly imperative statements in metalanguages. Let's try something a little more 'real world':

    var signupVariables = $.extend(clone(Strings['en'].userSignup), userData);
    var configPromise = readFile('signupConfig.json');
    var fileLoadPromise = config.then(function( data ){
        $.extend(signupVariables, config)
        return templatePromise('userSignup.tpl');
    }, function( err ) {
        logError(err);
        return templatePromise('userSignup.tpl');
    }).then(function( template ){
        template.then(function(template){
            var renderedHTML = renderTemplate(template, signupVariables);
            $('modal').html(renderedHTML).show();
        }, function( err ) {
            logError(err);
        });
    });
    
Very practical, but complete bullshit. Instead let's try:

    var signupVariables = $.extend(clone(Strings['en'].userSignup), userData);
    request({
        url:'signupConfig.json',
        json : true
    }, function(err, request, config){
        if(!err) $.extend(signupVariables, config)
        request('userSignup.tpl', function(err, request, result){
            var renderedHTML = renderTemplate(template, signupVariables);
            $('modal').html(renderedHTML).show();
        });
    });
    
So what was it you were saying about the woes of 'callback hell'... the need for pointless indirection through another library? I think the man in black said it so much more eloquently than I ever could:

![well, fuck that](https://raw2.github.com/khrome/lies.js/master/cash.jpg)

If you want flow control, just use [async](https://npmjs.org/package/async) or (shameless plug) [async-arrays](https://npmjs.org/package/async-arrays).

Not to burst everyone's bubble, but if you just use objects, who's members handle a limited depth of asynchronous callbacks, not only will your functions be short and action specific, but you can stop the indirect imperative mishmash of functions that most JS is, and promises only encourages.

Testing
-------

    "We promise, hope, believe, — there breathes despair."
    -Lord Byron

Currently the tests only run a primitive set of tests for conformance to the promises/A spec, there will eventually be a 'strict' (wasteful) mode which should pass the full suite of Promises/A tests. Eventually I'll implement a 3rd interface for Promises/B but it remains to be seen if Promises/A+ is worth implementing. Part of the premise of this library is that in celebrating what promises are, people have totally passed over the power of implementing them as extension of a generalized state machine.

All you have to do is run:

    mocha

A Final Note
------------
I'm probably being needlessly aggressive in my tone here, but it's deliberate to match those voices hailing promises as some radical new programming paradigm, rather than a clever layover from [project Xanadu](http://en.wikipedia.org/wiki/Project_Xanadu), much like the equally clever [Enfilade](http://en.wikipedia.org/wiki/Enfilade_(Xanadu\)). This is nothing new, but in it's current incarnation threatens to completely infect js libs and I feel like voices are needed to stem this tide of needless indirection. If you disagree, I'd love to hear about your reasoning even if you just think I'm being a prick.

    "Should my voice fade in your ears, and my love vanish in your memory, then I will come again,
    And with a richer heart and lips more yielding to the spirit will I speak.
    Yea, I shall return with the tide…
    If aught I have said is truth, that truth shall reveal itself in a clearer voice, and in words more kin to your thoughts…
    And if this day is not a fulfillment of your needs and my love, then let it be a promise till another day…
    Know, therefore, that from the greater silence I shall return…
    A little while, a moment of rest upon the wind, and another woman shall bear me."
    -Kahlil Gibran : The Promise

Enjoy,

-Abbey Hawk Sparrow