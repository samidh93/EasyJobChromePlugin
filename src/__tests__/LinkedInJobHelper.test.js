import LinkedInJobHelper from '../LinkedInJobHelper';

// Mock DOM elements
function createMockElement(innerHTML) {
    return {
        innerHTML,
        querySelector: jest.fn(),
        querySelectorAll: jest.fn(),
        textContent: '',
        click: jest.fn(),
        scrollIntoView: jest.fn()
    };
}

describe('LinkedInJobHelper', () => {
    beforeEach(() => {
        // Reset all mocks
        jest.clearAllMocks();
        
        // Setup document mock
        document.querySelector = jest.fn();
        document.querySelectorAll = jest.fn();
    });

    describe('getTotalJobsSearchCount', () => {
        it('should parse total jobs count correctly', async () => {
            const mockElement = createMockElement('');
            mockElement.querySelector.mockReturnValue({
                textContent: '1,234 jobs'
            });

            const result = await LinkedInJobHelper.getTotalJobsSearchCount(mockElement);
            expect(result).toBe(1234);
        });

        it('should handle no results', async () => {
            const mockElement = createMockElement('');
            mockElement.querySelector.mockReturnValue(null);

            const result = await LinkedInJobHelper.getTotalJobsSearchCount(mockElement);
            expect(result).toBe(0);
        });
    });

    describe('getListOfJobsOnPage', () => {
        it('should return list of jobs', async () => {
            const mockJobs = [
                createMockElement('<div>Job 1</div>'),
                createMockElement('<div>Job 2</div>')
            ];
            const mockElement = createMockElement('');
            mockElement.querySelector.mockReturnValue({
                querySelectorAll: jest.fn().mockReturnValue(mockJobs)
            });

            const result = await LinkedInJobHelper.getListOfJobsOnPage(mockElement);
            expect(result).toHaveLength(2);
        });

        it('should handle no jobs found', async () => {
            const mockElement = createMockElement('');
            mockElement.querySelector.mockReturnValue(null);

            const result = await LinkedInJobHelper.getListOfJobsOnPage(mockElement);
            expect(result).toHaveLength(0);
        });
    });

    describe('clickEasyApply', () => {
        it('should click easy apply button when found', async () => {
            const mockButton = {
                click: jest.fn()
            };
            document.querySelector.mockReturnValue(mockButton);

            await LinkedInJobHelper.clickEasyApply();
            expect(mockButton.click).toHaveBeenCalled();
        });

        it('should handle missing easy apply button', async () => {
            document.querySelector.mockReturnValue(null);
            
            // Should not throw error
            await expect(LinkedInJobHelper.clickEasyApply()).resolves.not.toThrow();
        });
    });
}); 