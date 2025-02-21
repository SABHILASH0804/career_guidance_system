const fs = require("fs");
const pdfParse = require("pdf-parse");

// Predefined list of skills
const skillKeywords = [
    "JavaScript", "Python", "Java", "C++", "HTML", "CSS", "Node.js", "React",
    "Angular", "SQL", "MongoDB", "AWS", "Docker", "Machine Learning",
    "Data Science", "Cybersecurity", "DevOps", "Git", "Time management","trading"
];

/**
 * Extracts skills from a resume PDF file.
 * @param {string} filePath - The path of the uploaded resume file.
 * @returns {Promise<string>} - A string containing extracted skills.
 */
async function extractSkills(filePath) {
    try {
        // Read the PDF file
        const dataBuffer = fs.readFileSync(filePath);
        const pdfData = await pdfParse(dataBuffer);
        const text = pdfData.text.toLowerCase(); // Convert to lowercase for consistency

        // Extract skills that are in the predefined list
        let extractedSkills = skillKeywords.filter(skill =>
            text.includes(skill.toLowerCase()) // Case-insensitive matching
        );

        // Remove duplicates
        extractedSkills = [...new Set(extractedSkills)];

        console.log("Extracted Skills:", extractedSkills);

        return extractedSkills.length > 0 ? extractedSkills.join(", ") : "No relevant skills found";
    } catch (error) {
        console.error("Error extracting skills:", error);
        return "Error extracting skills";
    }
}

module.exports = extractSkills;
