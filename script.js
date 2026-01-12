   
        import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
        import { getAuth, signInAnonymously, signInWithCustomToken } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
        import { getFirestore, setLogLevel, collection, addDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
        
        // --- Firebase/Global Initialization ---
        setLogLevel('Debug');

        const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
        
        // --- START OF LOCAL FIREBASE CONFIGURATION ---
        const localFirebaseConfig = {
              apiKey: "",
              authDomain: "vaps-local-test.firebaseapp.com",
              projectId: "vaps-local-test",
              storageBucket: "vaps-local-test.firebasestorage.app",
              messagingSenderId: "413765697785",
              appId: ""
        };
        
        const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : localFirebaseConfig;

        const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;
        
        let app;
        let db;
        let auth;
        let userId = 'sim-user-' + Math.random().toString(36).substring(2, 9); 
        let savedPolicies = [];
        let isFirebaseReady = false;

        try {
            if (Object.keys(firebaseConfig).length > 0 && firebaseConfig.projectId) {
                app = initializeApp(firebaseConfig);
                db = getFirestore(app);
                auth = getAuth(app);

                const authHandler = (user) => {
                    if (user) {
                        userId = user.uid;
                        isFirebaseReady = true;
                        loadSavedPolicies();
                    } else {
                        isFirebaseReady = true;
                        loadSavedPolicies(); 
                    }
                };

                if (initialAuthToken) {
                    signInWithCustomToken(auth, initialAuthToken)
                        .then(userCredential => authHandler(userCredential.user))
                        .catch(error => {
                            console.error("Custom token sign-in failed, trying anonymous:", error);
                            signInAnonymously(auth).then(userCredential => authHandler(userCredential.user));
                        });
                } else {
                    signInAnonymously(auth).then(userCredential => authHandler(userCredential.user))
                    .catch(error => {
                        console.error("Anonymous sign-in failed:", error);
                        isFirebaseReady = true;
                        document.getElementById('loading-history').textContent = "Authentication failed. Check your Firebase config and rules.";
                    });
                }
            } else {
                console.warn("Firebase config not available. Running in local simulation mode (no history saving).");
                isFirebaseReady = true;
                document.getElementById('loading-history').textContent = "History not available (Firebase missing).";
            }
        } catch (error) {
            console.error("Firebase initialization failed:", error);
            isFirebaseReady = true;
        }

        // --- Global State and Configuration ---

        const API_KEY = "AIzaSyAocuULEXot-FJEMGX-xu5nSf8SW9KhAF4"; // Kept empty as per instructions
        const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${API_KEY}`;
        const policyState = {
            currentStage: 0,
            simulationId: null,
            initialIdea: null,
            refinedProblem: null,
            policyOptions: null,
            selectedPolicy: null,
            implementationPlan: null,
            evaluationSummary: null,
            vapsHistory: []
        };

        const stageConfig = [
            { id: 1, name: "Agenda Setting", vaps: "B (Benevolence)", description: "Ensures the policy idea considers the most ignored stakeholders." },
            { id: 2, name: "Policy Formulation", vaps: "A (Ability)", description: "Verifies the problem definition and stakeholders with grounded data." },
            { id: 3, name: "Policy Selection", vaps: "I/A (Integrity & Ability)", description: "Iterative critique for conflicts of interest and hidden costs." },
            { id: 4, name: "Policy Implementation", vaps: "A (Ability)", description: "Red Team checks the plan for logistical weak points and coordination failures." },
            { id: 5, name: "Policy Evaluation", vaps: "I (Integrity)", description: "Skeptic Agent critiques the data quality and outcome attribution for bias." }
        ];

        // --- Utility Functions (Firestore and UI functions remain the same) ---
        // (Simplified for brevity, but all essential functions like getSimulationsCollectionRef, saveSimulationToDb, loadSavedPolicies, renderSavedPolicies, viewSavedPolicy, simpleMarkdownToHtml are present)

        function getEl(id) {
            return document.getElementById(id);
        }

        function getFormattedDate(timestamp) {
            const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
            return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        }
        
        function getSimulationsCollectionRef() {
             if (db && userId && appId) {
                 return collection(db, `artifacts/${appId}/users/${userId}/simulations`);
             }
             return null;
        }

        async function saveSimulationToDb() {
            const simulationsRef = getSimulationsCollectionRef();
            if (simulationsRef && policyState.vapsHistory.length === stageConfig.length) {
                try {
                    const dataToSave = {
                        ...policyState,
                        timestamp: new Date().toISOString(),
                        initialIdeaTitle: policyState.initialIdea.substring(0, 80) + (policyState.initialIdea.length > 80 ? '...' : '')
                    };
                    delete dataToSave.currentStage;
                    await addDoc(simulationsRef, dataToSave);
                } catch (e) {
                    console.error("Error saving document: ", e);
                }
            }
        }
        
        function simpleMarkdownToHtml(markdown) {
            let html = markdown || '';
            const tableRegex = /(\|.*?\|\s*\n\|[-: ]+?\|.*?\|\s*\n)((?:\|.*?\|\s*\n)*)/g;
            html = html.replace(tableRegex, (match, headerAndSeparator, rows) => {
                let tableHtml = '';
                let headerRowMatch = headerAndSeparator.split('\n')[0].trim();
                tableHtml = '<thead><tr>';
                headerRowMatch.split('|').filter(h => h.trim() !== '').forEach(header => {
                    tableHtml += `<th class="px-2 py-1 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-100">${header.trim()}</th>`;
                });
                tableHtml += '</tr></thead>';
                
                tableHtml += '<tbody class="divide-y divide-gray-200">';
                rows.split('\n').filter(row => row.trim() !== '').forEach(row => {
                    tableHtml += '<tr>';
                    row.split('|').filter(cell => cell.trim() !== '').forEach(cell => {
                        tableHtml += `<td class="px-2 py-1 whitespace-pre-wrap text-sm text-gray-800">${cell.trim()}</td>`;
                    });
                    tableHtml += '</tr>';
                });
                tableHtml += '</tbody>';
                
                return '<div class="overflow-x-auto"><table class="min-w-full divide-y divide-gray-300 border border-gray-300 rounded-lg my-2">' + tableHtml + '</table></div>';
            });
            
            html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
            html = html.replace(/\n\n/g, '</p><p>');
            html = html.replace(/\n/g, '<br>');

            if (!html.startsWith('<p>') && !html.startsWith('<div')) {
                html = '<p>' + html;
            }
            if (!html.endsWith('</p>') && !html.endsWith('</div>')) {
                html = html + '</p>';
            }

            return html;
        }

        // --- UI Rendering ---

        function updateUI() {
            const currentStageIndex = policyState.currentStage;
            const startBtn = getEl('start-btn');
            const totalStages = stageConfig.length;

            if (startBtn && currentStageIndex < totalStages) {
                startBtn.textContent = `Start Stage ${currentStageIndex + 1}: ${stageConfig[currentStageIndex].name} (Deep Agent)`;
            }
            
            stageConfig.forEach((stage, index) => {
                const element = getEl(`stage-${stage.id}`);
                
                if (element) { 
                    element.classList.remove('active-stage', 'completed-stage', 'text-gray-900', 'text-gray-500', 'border-gray-300', 'border-teal-500', 'border-blue-500');
                    if (index < currentStageIndex) {
                        element.classList.add('completed-stage', 'text-gray-900', 'border-blue-500');
                    } else if (index === currentStageIndex) {
                        element.classList.add('active-stage', 'text-gray-900', 'border-teal-500');
                    } else {
                        element.classList.add('border-gray-300', 'text-gray-500');
                    }
                }
            });
            
            const reportHistoryArea = getEl('report-history-area');
            if (currentStageIndex === totalStages && policyState.simulationId) {
                showDetailedReportHistory(true); 
            } else {
                reportHistoryArea?.classList.add('hidden');
            }
        }

        function setLoading(isLoading, buttonId = 'next-stage-btn') {
            const btn = getEl(buttonId);
            const llmResult = getEl('llm-result');

            if (!btn || !llmResult) return;

            if (isLoading) {
                btn.textContent = 'Processing...';
                btn.disabled = true;
                btn.classList.add('opacity-60', 'cursor-not-allowed');
                llmResult.innerHTML = '<div class="text-center py-8 text-teal-600 animate-pulse">Deep Agent Running Iterations... This may take a moment.</div>';
            } else {
                btn.disabled = false;
                btn.classList.remove('opacity-60', 'cursor-not-allowed');
            }
        }

        function createPayload(systemPrompt, userQuery, isGrounded = false) {
            const payload = {
                contents: [{ parts: [{ text: userQuery }] }],
                systemInstruction: { parts: [{ text: systemPrompt }] },
            };
            if (isGrounded) {
                payload.tools = [{ "google_search": {} }];
            }
            return payload;
        }

        async function geminiCall(systemPrompt, userQuery, isGrounded = false) {
            for (let attempt = 1; attempt <= 5; attempt++) {
                try {
                    const payload = createPayload(systemPrompt, userQuery, isGrounded);

                    const response = await fetch(API_URL, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });

                    if (response.status === 429 && attempt < 5) {
                        const delay = Math.pow(2, attempt) * 1000;
                        await new Promise(resolve => setTimeout(resolve, delay));
                        continue;
                    }

                    if (!response.ok) {
                        throw new Error(`API returned status ${response.status}: ${await response.text()}`);
                    }

                    const result = await response.json();
                    const text = result.candidates?.[0]?.content?.parts?.[0]?.text || "No valid response from LLM.";
                    return text;

                } catch (error) {
                    if (attempt === 5) {
                        console.error("LLM API call failed after multiple retries:", error);
                        return `ERROR: Failed to run VAPS check. ${error.message}`;
                    }
                }
            }
            return "ERROR: Critical failure in LLM communication.";
        }

        // --- New Core Deep Agent Runner ---

        async function runDeepAgentStage(stage, vaps, context, generatePrompt, critiquePrompt, synthesizePrompt, isGrounded = false) {
            let llmOutput = "";
            let critiqueOutput = "";
            let synthesisOutput = "";

            // Phase 1: Generation Agent
            const generationSystemPrompt = `You are the ${stage} Policy Generator (Focus: ${vaps}). ${generatePrompt}`;
            llmOutput = await geminiCall(generationSystemPrompt, context, isGrounded);
            
            // Phase 2: Critique Agent (Reflection)
            const critiqueSystemPrompt = `You are the Deep Agent's Critique Core. Your role is to rigorously challenge the generated plan/report based on the VAPS dimension of ${vaps}. ${critiquePrompt}`;
            const critiqueQuery = `Original Output:\n---\n${llmOutput}\n---\n\nCritique this output against the specified VAPS dimension (${vaps}).`;
            critiqueOutput = await geminiCall(critiqueSystemPrompt, critiqueQuery, isGrounded);

            // Phase 3: Synthesis Agent
            const synthesisSystemPrompt = `You are the Synthesis Agent. Combine the initial Output and the Critique into a final, robust decision/report. The final report MUST be titled **Deep Agent ${stage} Synthesis** and clearly incorporate the critique's necessary adjustments. ${synthesizePrompt}`;
            const synthesisQuery = `Initial Output:\n---\n${llmOutput}\n---\n\nCritique:\n---\n${critiqueOutput}\n---\n\nSynthesize the final, refined policy component.`;
            synthesisOutput = await geminiCall(synthesisSystemPrompt, synthesisQuery, isGrounded);

            return synthesisOutput;
        }

        // --- Stage Logic (Updated to use runDeepAgentStage) ---

        async function runStage() {
            const currentStageIndex = policyState.currentStage;
            const totalStages = stageConfig.length;
            
            if (currentStageIndex >= totalStages) {
                updateUI();
                return;
            }

            setLoading(true);
            const config = stageConfig[currentStageIndex];
            const stageStatusEl = getEl('stage-status');
            
            let finalOutput = "";
            let problemContext = "";

            try {
                // STAGE 1: Agenda Setting (Benevolence)
                if (currentStageIndex === 0) {
                    problemContext = policyState.initialIdea;
                    const generatePrompt = `Identify the three most vulnerable or overlooked stakeholder groups affected by the policy idea: "${problemContext}". For each, articulate their strongest, most compelling counter-argument for why this policy should NOT be pursued.`;
                    const critiquePrompt = `Analyze the identified counter-arguments. Are they truly the 'strongest' and do they represent the most 'vulnerable' groups? Suggest a counter-argument that is even more damning or represents a more marginalized group (Benevolence check).`;
                    const synthesizePrompt = `Provide a final, refined problem statement that explicitly addresses the most damning counter-argument found by the Critique Core.`;
                    
                    finalOutput = await runDeepAgentStage(config.name, config.vaps, problemContext, generatePrompt, critiquePrompt, synthesizePrompt);

                    policyState.refinedProblem = `Initial Policy Idea: ${policyState.initialIdea}. Refinement based on Benevolence Deep Agent: ${finalOutput}`;
                    if (stageStatusEl) stageStatusEl.innerHTML = `<span class="vaps-badge vaps-B">Benevolence (B) Check Complete</span>: **Agenda Setting** Passed.`;

                // STAGE 2: Policy Formulation (Ability)
                } else if (currentStageIndex === 1) {
                    problemContext = policyState.refinedProblem;
                    const generatePrompt = `Clearly define the refined problem and identify 3 verifiable key stakeholder groups, using RAG/Google Search to find recent, authoritative data to ground your findings. Your response must include a refined, measurable problem statement.`;
                    const critiquePrompt = `Analyze the generated problem statement and stakeholder list. Are the facts used truly current and authoritative? Challenge the measurability of the problem statement and suggest an alternative based on verifiable data (Ability check).`;
                    const synthesizePrompt = `Produce a final, data-grounded formulation report, including a **Measurable Problem Statement** and a list of **Verified Stakeholders**.`;
                    
                    finalOutput = await runDeepAgentStage(config.name, config.vaps, problemContext, generatePrompt, critiquePrompt, synthesizePrompt, true);

                    policyState.policyOptions = `Formulation Synthesis: ${finalOutput}`;
                    if (stageStatusEl) stageStatusEl.innerHTML = `<span class="vaps-badge vaps-A">Ability (A) Check Complete</span>: **Policy Formulation** Successful.`;

                // STAGE 3: Policy Selection (Integrity/Ability) - Now uses the runDeepAgentStage function
                } else if (currentStageIndex === 2) {
                    problemContext = policyState.policyOptions;
                    const generatePrompt = `Propose and select a policy based on the problem defined: ${problemContext}. Constraint: The option must cost less than $5 million/year. Include a Markdown table with 3 policy options (A, B, C) showing Option, Description, Institutional Constraint (Pass/Fail), C-Score (60-95%). Select the compliant option with the highest C-Score.`;
                    const critiquePrompt = `Act as the Skeptic Core. Find the single largest Integrity flaw (conflict of interest or hidden cost) AND the single largest Ability flaw (unproven technology, lack of personnel) in the SELECTED policy.`;
                    const synthesizePrompt = `Produce a final **Selection & Critique Report** that confirms the selected policy while explicitly outlining the necessary adjustments required to mitigate the Integrity and Ability flaws identified by the Critique Core.`;
                    
                    finalOutput = await runDeepAgentStage(config.name, config.vaps, problemContext, generatePrompt, critiquePrompt, synthesizePrompt);
                    
                    policyState.selectedPolicy = `Problem: ${policyState.refinedProblem}. Selected Policy Analysis: ${finalOutput}`;
                    if (stageStatusEl) stageStatusEl.innerHTML = `<span class="vaps-badge vaps-I">Integrity (I) Check &</span> <span class="vaps-badge vaps-A">Ability (A) Check Complete</span>: **Deep Agent Selection** Complete.`;

                // STAGE 4: Policy Implementation (Ability)
                } else if (currentStageIndex === 3) {
                    problemContext = policyState.selectedPolicy;
                    const generatePrompt = `Translate the selected policy into an actionable Implementation Plan. Include: 1) A rewrite of the main policy goal using S.M.A.R.T. criteria. 2) A list of the two primary inter-agency coordination actions required for execution.`;
                    const critiquePrompt = `Act as the Red Team Agent. Challenge the feasibility of the S.M.A.R.T. goal and the coordination plan. Identify the single most likely point of failure (logistical bottleneck or unaddressed dependency) in the plan (Ability check).`;
                    const synthesizePrompt = `Generate the final, robust **Implementation Plan**, ensuring the S.M.A.R.T. goal and coordination steps are adjusted to overcome the logistical bottleneck identified by the Red Team.`;
                    
                    finalOutput = await runDeepAgentStage(config.name, config.vaps, problemContext, generatePrompt, critiquePrompt, synthesizePrompt);

                    policyState.implementationPlan = `Implementation Details: ${finalOutput}`;
                    if (stageStatusEl) stageStatusEl.innerHTML = `<span class="vaps-badge vaps-A">Ability (A) Check Complete</span>: **Policy Implementation** Plan Ready.`;

                // STAGE 5: Policy Evaluation (Integrity)
                } else if (currentStageIndex === 4) {
                    problemContext = policyState.implementationPlan;
                    const generatePrompt = `Simulate an outcome where the policy was partially successful. Report the simulated outcome and the key evaluation metrics.`;
                    const critiquePrompt = `Act as the Integrity Auditor. Challenge the quality of the simulated data (e.g., sample size, duration, control group issues) and critique the credibility of attributing the partial success *solely* to the policy. Identify the biggest potential confounding factor (Integrity check).`;
                    const synthesizePrompt = `Provide a final, credible **Evaluation Credibility Report**. State the simulated outcome, but present an honest assessment of its limitations and the true attribution based on the Integrity Audit.`;
                    
                    finalOutput = await runDeepAgentStage(config.name, config.vaps, problemContext, generatePrompt, critiquePrompt, synthesizePrompt);

                    policyState.evaluationSummary = `Final Evaluation: ${finalOutput}`;
                    if (stageStatusEl) stageStatusEl.innerHTML = `<span class="vaps-badge vaps-I">Integrity (I) Check Complete</span>: **Policy Evaluation** Finalized.`;
                }
                
                // --- Post-Stage Actions ---
                policyState.vapsHistory.push({ 
                    stage: config.name, 
                    vaps: config.vaps, 
                    summary: finalOutput,
                    timestamp: new Date().toISOString()
                });
                
                const llmResultEl = getEl('llm-result');
                if (llmResultEl) {
                    const renderedHtml = simpleMarkdownToHtml(finalOutput);
                    llmResultEl.innerHTML = `
                        <div class="p-4 bg-gray-50 rounded-lg border-l-4 border-teal-500">
                            <p class="font-bold text-teal-700">Deep Agent Final Synthesis Output (${config.name}):</p>
                            <div class="mt-2 text-sm whitespace-pre-wrap">${renderedHtml}</div>
                        </div>
                    `;
                }

            } catch(e) {
                console.error("Error during runStage execution:", e);
                const llmResultEl = getEl('llm-result');
                if (llmResultEl) {
                     llmResultEl.innerHTML = `<div class="p-4 bg-red-100 text-red-700 rounded-lg">An unexpected error occurred: ${e.message}. Check the console for details.</div>`;
                }
            } finally {
                if (!finalOutput.startsWith('ERROR:') && currentStageIndex < totalStages) {
                     policyState.currentStage++;
                }

                updateUI();
                
                const nextStageIndex = policyState.currentStage;
                if (nextStageIndex < totalStages) {
                    const btn = getEl('next-stage-btn');
                    if (btn) {
                        btn.textContent = `Run Stage ${nextStageIndex + 1}: ${stageConfig[nextStageIndex].name} (Deep Agent)`;
                        setLoading(false);
                    }
                } else {
                    const btn = getEl('next-stage-btn');
                    if (btn) {
                        btn.textContent = "Simulation Complete";
                        btn.disabled = true;
                        btn.classList.add('opacity-50');
                    }
                    if (stageStatusEl) stageStatusEl.textContent = "VAPS Deep Agent Simulation Completed.";
                    saveSimulationToDb();
                }
            }
        }

        // --- UI Control Functions (The rest remain the same) ---
        function loadSavedPolicies() {
            if (!isFirebaseReady) return;
            const simulationsRef = getSimulationsCollectionRef();
            const loadingEl = getEl('loading-history');

            if (simulationsRef) {
                onSnapshot(simulationsRef, (snapshot) => {
                    savedPolicies = [];
                    snapshot.forEach((doc) => {
                        const data = doc.data();
                        savedPolicies.push({ 
                            id: doc.id, 
                            ...data 
                        });
                    });
                    
                    savedPolicies.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                    
                    renderSavedPolicies();
                    if(loadingEl) loadingEl.classList.add('hidden');
                }, (error) => {
                    console.error("Error loading saved policies:", error);
                    if(loadingEl) loadingEl.textContent = "Error loading history.";
                });
            } else {
                if(loadingEl) loadingEl.textContent = "History unavailable in this environment.";
            }
        }
        
        function renderSavedPolicies() {
            const listEl = getEl('saved-policies-list');
            if (listEl) {
                if (savedPolicies.length === 0) {
                    listEl.innerHTML = '<p class="text-gray-500 italic text-sm">No past simulations found. Complete a full run to save one!</p>';
                    return;
                }
                
                listEl.innerHTML = savedPolicies.map(policy => {
                    const date = getFormattedDate(policy.timestamp);
                    return `
                        <div class="flex justify-between items-center p-3 bg-white rounded-lg border border-gray-200 shadow-sm">
                            <div class="text-sm">
                                <p class="font-medium text-gray-800 truncate" title="${policy.initialIdeaTitle}">${policy.initialIdeaTitle}</p>
                                <p class="text-xs text-gray-500">Run on ${date}</p>
                            </div>
                            <button onclick="window.viewSavedPolicy('${policy.id}')" class="ml-4 px-3 py-1 text-xs bg-blue-500 text-white font-semibold rounded-full hover:bg-blue-600 transition duration-150">
                                View
                            </button>
                        </div>
                    `;
                }).join('');
            }
        }
        
        window.viewSavedPolicy = function(policyId) {
             const selectedPolicy = savedPolicies.find(p => p.id === policyId);

             if (!selectedPolicy) {
                 console.error("Policy not found:", policyId);
                 return;
             }
             
             const tempCurrentStage = policyState.currentStage;
             Object.assign(policyState, selectedPolicy);
             policyState.currentStage = tempCurrentStage; 
             
             policyState.currentStage = stageConfig.length; 
             policyState.simulationId = policyId;

             const initialInputEl = getEl('initial-input');
             const nextStageBtnEl = getEl('next-stage-btn');
             const stageStatusEl = getEl('stage-status');
             
             if (initialInputEl) initialInputEl.classList.add('hidden');
             if (nextStageBtnEl) {
                 nextStageBtnEl.classList.add('opacity-50');
                 nextStageBtnEl.textContent = "Simulation Complete";
                 nextStageBtnEl.disabled = true;
                 nextStageBtnEl.classList.remove('hidden');
             }
             if (stageStatusEl) stageStatusEl.textContent = `Viewing Saved Simulation: ${selectedPolicy.initialIdeaTitle}`;

             const llmResultEl = getEl('llm-result');
             const finalReport = policyState.vapsHistory[policyState.vapsHistory.length - 1];
             if (llmResultEl && finalReport) {
                 const renderedHtml = simpleMarkdownToHtml(finalReport.summary);

                 llmResultEl.innerHTML = `
                        <div class="p-4 bg-gray-50 rounded-lg border-l-4 border-blue-500">
                            <p class="font-bold text-blue-700">Final Evaluation Summary (Stage 5 - Integrity):</p>
                            <div class="mt-2 text-sm whitespace-pre-wrap">${renderedHtml}</div>
                            <button onclick="window.showDetailedReportHistory()" class="mt-3 px-4 py-2 text-sm bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-600 transition duration-150">
                                View Full 5-Stage Report
                            </button>
                        </div>
                    `;
             }
             
             updateUI(); 
             
             const historyListContainer = getEl('history-list-container');
             if (historyListContainer) historyListContainer.classList.add('hidden');
             getEl('history-arrow')?.classList.remove('rotate-180');
             showDetailedReportHistory(true);
        }
        
        window.showDetailedReportHistory = function(show = false) {
             const detailArea = getEl('report-history-area');
             
             if (!detailArea) return;

             if (show || detailArea.classList.contains('hidden')) {
                  detailArea.classList.remove('hidden');
                  
                  detailArea.innerHTML = `
                        <h3 class="text-sm font-bold text-gray-700 border-b pb-2 mb-2">Detailed VAPS Report History for: ${policyState.initialIdeaTitle}</h3>
                        <div class="space-y-4">
                            ${policyState.vapsHistory.map(report => `
                                <div class="p-3 bg-white rounded-lg border border-gray-100 shadow-sm">
                                    <p class="text-xs font-bold ${report.vaps.includes('B') ? 'text-red-600' : report.vaps.includes('I') ? 'text-amber-600' : 'text-teal-600'}">${report.stage}: ${report.vaps} Check</p>
                                    <div class="text-gray-700 text-sm mt-1 whitespace-pre-wrap">${simpleMarkdownToHtml(report.summary)}</div>
                                </div>
                            `).join('')}
                        </div>
                   `;
             } else {
                 detailArea.classList.add('hidden');
             }
        }

        window.startSimulation = function() {
            const ideaInput = getEl('policy-idea');
            const idea = ideaInput ? ideaInput.value.trim() : null;

            if (!idea) {
                const statusEl = getEl('stage-status');
                if(statusEl) statusEl.textContent = "Please enter a policy idea to start the simulation.";
                return;
            }

            policyState.currentStage = 0;
            policyState.initialIdea = idea;
            policyState.vapsHistory = [];
            policyState.simulationId = crypto.randomUUID();
            policyState.initialIdeaTitle = idea.substring(0, 80) + (idea.length > 80 ? '...' : '');


            const initialInputEl = getEl('initial-input');
            const nextStageBtnEl = getEl('next-stage-btn');

            if (initialInputEl) initialInputEl.classList.add('hidden');
            if (nextStageBtnEl) nextStageBtnEl.classList.remove('hidden');
            
            runStage();
        }

        window.runNextStage = function() {
            if (policyState.currentStage < stageConfig.length) {
                runStage();
            }
        }

        window.toggleHistory = function() {
            const historyArea = getEl('history-list-container');
            const arrow = getEl('history-arrow');
            
            if (historyArea) {
                const isHidden = historyArea.classList.toggle('hidden');
                if (arrow) arrow.classList.toggle('rotate-180', !isHidden);
            }
        }

        window.onload = function() {
            updateUI();
        };
