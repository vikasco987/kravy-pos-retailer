export async function getBase64ImageFromUrl(imageUrl: string): Promise<string> {
  try {
    const res = await fetch(imageUrl, { mode: 'cors' });
    const blob = await res.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    console.error("Failed to convert image to base64", err);
    return "";
  }
}
