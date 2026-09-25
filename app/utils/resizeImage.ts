// Redimensiona no navegador e devolve data URL (a imagem fica dentro da config, sem pasta de uploads).
export const resizeImage = (file: File, opts: { square?: number; maxWidth?: number } = {}): Promise<string> =>
  new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')!
      if (opts.square) {
        const side = Math.min(img.width, img.height)
        canvas.width = canvas.height = opts.square
        ctx.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, opts.square, opts.square)
        resolve(canvas.toDataURL('image/png'))
      } else {
        const w = Math.min(img.width, opts.maxWidth || 1280)
        canvas.width = w
        canvas.height = Math.round(img.height * (w / img.width))
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', 0.85))
      }
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Imagem inválida')) }
    img.src = url
  })
