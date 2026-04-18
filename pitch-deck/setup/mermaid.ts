import { defineMermaidSetup } from '@slidev/types'

export default defineMermaidSetup(() => {
  return {
    theme: 'base',
    themeVariables: {
      primaryColor: '#3070b3',
      primaryTextColor: '#1c1c1c',
      primaryBorderColor: '#3070b3',
      lineColor: '#9c9c9c',
      secondaryColor: '#f0efec',
      tertiaryColor: '#e8e6e1',
      background: '#f7f6f3',
      mainBkg: '#ffffff',
      nodeBorder: '#3070b3',
      clusterBkg: '#f0efec',
      clusterBorder: '#e0ddd7',
      titleColor: '#1c1c1c',
      edgeLabelBackground: '#f7f6f3',
      nodeTextColor: '#1c1c1c',
    }
  }
})
