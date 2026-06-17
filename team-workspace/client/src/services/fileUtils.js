/**
 * Converts a file object from an input element into a Base64 data URL string.
 */
export const convertToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const fileReader = new FileReader();
    fileReader.readAsDataURL(file);
    
    fileReader.onload = () => {
      resolve(fileReader.result);
    };
    
    fileReader.onerror = (error) => {
      reject(error);
    };
  });
};

/**
 * Triggers a native browser download for a Base64 data URL string.
 */
export const downloadBase64File = (base64Data, fileName) => {
  const link = document.createElement("a");
  link.href = base64Data;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};