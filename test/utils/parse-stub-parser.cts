// this stub must be in a separate file to require from parse via moduleRequire
export let parse = () => {}

export const setParse = (newParse: () => void) => {
  parse = newParse
}
