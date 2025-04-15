import yaml from 'js-yaml';

class UserProfile {
    constructor() {
        this.profileData = null;
    }

    async loadUserData(yamlContent) {
        try {
            this.profileData = yaml.load(yamlContent);
            console.log(this.profileData)
            return this.profileData;
        } catch (error) {
            console.error('Error loading YAML data:', error);
            throw error;
        }
    }

    // Personal Information Getters
    getFirstName() {
        return this.profileData?.personal?.firstName || '';
    }

    getLastName() {
        return this.profileData?.personal?.lastName || '';
    }

    getFullName() {
        return `${this.getFirstName()} ${this.getLastName()}`.trim();
    }

    getEmail() {
        return this.profileData?.personal?.email || '';
    }

    getPhone() {
        return this.profileData?.personal?.phone || '';
    }

    getCity() {
        return this.profileData?.personal?.city || '';
    }

    getState() {
        return this.profileData?.personal?.state || '';
    }

    getCountry() {
        return this.profileData?.personal?.country || '';
    }

    getZipCode() {
        return this.profileData?.personal?.zipCode || '';
    }

    getFullAddress() {
        const parts = [
            this.getCity(),
            this.getState(),
            this.getZipCode(),
            this.getCountry()
        ].filter(Boolean);
        return parts.join(', ');
    }

    getSummary(){   
    return this.profileData?.summary || '';
    }
    // Experience Getters
    getCurrentJobTitle() {
        return this.profileData?.experience?.[0]?.title || '';
    }

    getCurrentCompany() {
        return this.profileData?.experience?.[0]?.company || '';
    }

    getExperienceYears() {
        return this.profileData?.experience?.[0]?.years || 0;
    }

    getExperienceMonths() {
        return this.profileData?.experience?.[0]?.months || 0;
    }

    getTotalExperience() {
        const years = this.getExperienceYears();
        const months = this.getExperienceMonths();
        return `${years} years ${months} months`;
    }

    // Education Getters
    getHighestDegree() {
        return this.profileData?.education?.[0]?.degree || '';
    }

    getUniversity() {
        return this.profileData?.education?.[0]?.university || '';
    }

    getGraduationYear() {
        return this.profileData?.education?.[0]?.graduationYear || '';
    }

    // Skills Getters
    getSkills() {
        return this.profileData?.skills || [];
    }

    getPrimarySkills() {
        return this.profileData?.skills?.primary || [];
    }

    getSecondarySkills() {
        return this.profileData?.skills?.secondary || [];
    }

    // Custom Answers Getters
    getCustomAnswers() {
        return this.profileData?.customAnswers || {};
    }

    getCustomAnswer(key) {
        return this.profileData?.customAnswers?.[key] || '';
    }

    // Setters
    setFirstName(firstName) {
        if (!this.profileData.personal) this.profileData.personal = {};
        this.profileData.personal.firstName = firstName;
    }

    setLastName(lastName) {
        if (!this.profileData.personal) this.profileData.personal = {};
        this.profileData.personal.lastName = lastName;
    }

    setEmail(email) {
        if (!this.profileData.personal) this.profileData.personal = {};
        this.profileData.personal.email = email;
    }

    setPhone(phone) {
        if (!this.profileData.personal) this.profileData.personal = {};
        this.profileData.personal.phone = phone;
    }

    setLocation(city, state, country, zipCode) {
        if (!this.profileData.personal) this.profileData.personal = {};
        this.profileData.personal.city = city;
        this.profileData.personal.state = state;
        this.profileData.personal.country = country;
        this.profileData.personal.zipCode = zipCode;
    }

    setCurrentJob(title, company, years, months) {
        if (!this.profileData.experience) this.profileData.experience = [];
        if (this.profileData.experience.length === 0) {
            this.profileData.experience.push({});
        }
        this.profileData.experience[0].title = title;
        this.profileData.experience[0].company = company;
        this.profileData.experience[0].years = years;
        this.profileData.experience[0].months = months;
    }

    setEducation(degree, university, graduationYear) {
        if (!this.profileData.education) this.profileData.education = [];
        if (this.profileData.education.length === 0) {
            this.profileData.education.push({});
        }
        this.profileData.education[0].degree = degree;
        this.profileData.education[0].university = university;
        this.profileData.education[0].graduationYear = graduationYear;
    }

    setSkills(primarySkills, secondarySkills) {
        if (!this.profileData.skills) this.profileData.skills = {};
        this.profileData.skills.primary = primarySkills;
        this.profileData.skills.secondary = secondarySkills;
    }

    setCustomAnswer(key, value) {
        if (!this.profileData.customAnswers) this.profileData.customAnswers = {};
        this.profileData.customAnswers[key] = value;
    }

    // Validation Methods
    validateRequiredFields() {
        const requiredFields = {
            personal: ['firstName', 'lastName', 'email', 'phone', 'city', 'state', 'country'],
            experience: ['title', 'company', 'years'],
            education: ['degree', 'university', 'graduationYear'],
            skills: ['primary']
        };

        const missingFields = [];

        for (const [section, fields] of Object.entries(requiredFields)) {
            for (const field of fields) {
                if (!this.profileData?.[section]?.[field]) {
                    missingFields.push(`${section}.${field}`);
                }
            }
        }

        return {
            isValid: missingFields.length === 0,
            missingFields
        };
    }

    // Export Methods
    toJSON() {
        return JSON.stringify(this.profileData, null, 2);
    }

    toYAML() {
        return yaml.dump(this.profileData);
    }
}

export default UserProfile;