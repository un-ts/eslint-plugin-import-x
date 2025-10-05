export let parseForESLint = () => {
  return {
    ast: {},
  }
}

export const setParseForESLint = (newParseForESLint: () => { ast: object }) => {
  parseForESLint = newParseForESLint
}

export let parse: () => void

export const setParse = (newParse: () => void) => {
  parse = newParse
}
