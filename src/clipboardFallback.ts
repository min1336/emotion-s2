export function copyTextWithTextarea(text: string, documentRef: Document = document) {
  const textarea = documentRef.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.left = "-9999px";
  textarea.style.position = "fixed";
  textarea.style.top = "0";

  documentRef.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  textarea.setSelectionRange(0, text.length);

  let copied: boolean;
  try {
    copied = documentRef.execCommand("copy");
  } catch {
    copied = false;
  }

  documentRef.body.removeChild(textarea);
  return copied;
}
