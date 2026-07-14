// 업로드한 사진을 작은 정사각형 JPEG로 줄여서 base64 문자열(data URL)로 바꾼다.
// Firestore 문서 하나는 1MB까지만 저장할 수 있고, Storage는 유료 요금제가 필요해서
// 이 방법으로 사진을 Firestore 문서 안에 직접 저장한다 (보통 몇 KB밖에 안 된다).

const AVATAR_SIZE = 128
const JPEG_QUALITY = 0.7

export function resizeImageToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('이미지를 읽지 못했어요.'))
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('이미지를 불러오지 못했어요.'))
      img.onload = () => {
        // 가운데를 정사각형으로 잘라낸 뒤 AVATAR_SIZE x AVATAR_SIZE로 축소
        const side = Math.min(img.width, img.height)
        const sx = (img.width - side) / 2
        const sy = (img.height - side) / 2

        const canvas = document.createElement('canvas')
        canvas.width = AVATAR_SIZE
        canvas.height = AVATAR_SIZE
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('이미지를 처리하지 못했어요.'))
          return
        }
        ctx.drawImage(img, sx, sy, side, side, 0, 0, AVATAR_SIZE, AVATAR_SIZE)
        resolve(canvas.toDataURL('image/jpeg', JPEG_QUALITY))
      }
      img.src = reader.result as string
    }
    reader.readAsDataURL(file)
  })
}
