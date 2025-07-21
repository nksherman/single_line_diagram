
const extractVersionFromPatchNotes = (text: string): string => {
  const versionMatch = text.match(/##\s*v(\d+\.\d+\.\d+)/);
  return versionMatch ? versionMatch[1] : "1.0.0";
};

export default extractVersionFromPatchNotes;
