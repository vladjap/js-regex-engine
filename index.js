function stateMatchesStringAtIndex(state, str, i) {
    if (i >= str.length) {
        return [false, 0];
    }

    if (state.type === 'wildcard') {
        return [true, 1];
    }

    if (state.type === 'element') {
        const match = state.value === str[i];
        return [match, match ? 1 : 0];
    }

    if (state.type === 'groupElement') {
        return test(state.states, str.slice(i));
    }

    throw new Error('Unsupported element type');
}

function test(states, str) {
    const queue = states.slice();
    let i = 0;
    const backtrackStack = [];
    let currentState = queue.shift();

    const backtrack = () => {
        queue.unshift(currentState);
        let couldBacktrack = false;

        while(backtrackStack.length) {
            const { isBacktrackable, state, consumptions } = backtrackStack.pop();

            if (isBacktrackable) {
                if (consumptions.length === 0) {
                    queue.unshift(state);
                    continue;
                }
                const n = consumptions.pop();
                i -= n;
                backtrackStack.push({ isBacktrackable, state, consumptions });
                couldBacktrack = true;
                break;
            }

            queue.unshift(state);
            consumptions.forEach(n => {
                i -= n;
            })

        }

        if (couldBacktrack) {
            currentState = queue.shift();
        }
        return couldBacktrack;

    }

    while(currentState) {
        switch (currentState.quantifier) {
            case "exactlyOne": {
                const [isMatch, consumed] = stateMatchesStringAtIndex(currentState, str, i);

                if (!isMatch) {
                    const indexBeforeBacktracking = i;
                    const couldBacktrack = backtrack();

                    if (!couldBacktrack) {
                        return [false, indexBeforeBacktracking];
                    }
                    continue;
                }

                backtrackStack.push({
                    isBacktrackable: false,
                    state: currentState,
                    consumptions: [ consumed ],
                })

                i += consumed;
                currentState = queue.shift();
                continue;
            }

            case "zeroOrOne": {
                if (i >= str.length) {
                    backtrackStack.push({
                        isBacktrackable: false,
                        state: currentState,
                        consumptions: [ 0 ],
                    });
                    currentState = queue.shift();
                    continue;
                }

                const [isMatch, consumed] = stateMatchesStringAtIndex(currentState, str, i);
                i += consumed;

                backtrackStack.push({
                    isBacktrackable: isMatch && consumed > 0,
                    state: currentState,
                    consumptions: [ consumed ],
                });
                currentState = queue.shift();
                continue;
            }

            case "zeroOrMore": {
                const backtrackState = {
                    isBacktrackable: true,
                    state: currentState,
                    consumptions: [],
                };
                while(true) {
                    if (i >= str.length) {
                        if (backtrackState.consumptions.length === 0) {
                            backtrackState.consumptions.push(0);
                            backtrackState.isBacktrackable = false;
                        }
                        backtrackStack.push(backtrackState);
                        currentState = queue.shift();
                        break;
                    }

                    const [isMatch, consumed] = stateMatchesStringAtIndex(currentState, str, i);

                    if (!isMatch || consumed === 0) {
                        if (backtrackState.consumptions.length === 0) {
                            backtrackState.consumptions.push(0);
                            backtrackState.isBacktrackable = false;
                        }
                        backtrackStack.push(backtrackState);
                        currentState = queue.shift();
                        break;
                    }
                    backtrackState.consumptions.push(consumed);

                    i += consumed;
                }
                continue;
            }

            default: {
                throw new Error('Unsupported operation');
            }

        }

    }

    return [true, i];
}

const parse = require('./parser');
// const regex = 'a?bc';
// const regex = 'a(b.)*cd';
const regex = 'a.*c';
const states = parse(regex);
// const exampleString = 'abc';
// const exampleString = 'ab!b$cd';
const exampleString = 'ac';
const result = test(states, exampleString);
console.log(result);
