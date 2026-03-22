    def generate_questions(self, n_questions: int, 
                          progress_callback: Optional[Callable[[int, int], None]] = None,
                          status_callback: Optional[Callable[[Dict[str, Any]], None]] = None,
                          max_failures: int = 20) -> List[Dict[str, Any]]:
        """
        Generate questions using concurrent workers.
        Continues generating until target successful questions are produced.
        """
        self.stats.start_time = time.time()
        self.results = []
        
        # Calculate target questions
        if self.systematic_config.mode == "random":
            target_questions = n_questions
        else:
            # Calculate total from schema targets (4+N logic)
            target_questions = sum(self.schema_targets.values()) if self.schema_targets else len(self.schema_list) * self.systematic_config.questions_per_schema

        print(f"\n{'='*70}")
        if self.systematic_config.mode == "systematic":
            print(f"Starting SYSTEMATIC question generation")
            print(f"Total schemas: {len(self.schema_list)}")
            print(f"Total target: {target_questions} successful questions")
        else:
            print(f"Starting concurrent question generation")
            print(f"Target: {target_questions} successful questions")
        print(f"Workers: {self.max_workers}")
        print(f"Max consecutive failures: {max_failures}")
        print(f"{'='*70}\n")
        
        question_counter = 0  # Total questions attempted
        consecutive_failures = 0  # Track consecutive failures
        
        # Schema progress tracking for systematic mode
        schema_progress = {}
        if self.systematic_config.mode == "systematic":
            for schema_id, _ in self.schema_list:
                target = self.schema_targets.get(schema_id, self.systematic_config.questions_per_schema)
                schema_progress[schema_id] = {
                    "target": target,
                    "successful": 0,
                    "status": "pending"
                }
        
        with ThreadPoolExecutor(max_workers=self.max_workers) as executor:
            active_futures = {}
            
            while self.stats.successful < target_questions:
                # Check failure limit
                if consecutive_failures >= max_failures:
                    print(f"\n{'='*70}")
                    print(f"STOPPING: Maximum consecutive failures ({max_failures}) reached!")
                    print(f"Successful: {self.stats.successful}/{target_questions}")
                    print(f"{'='*70}\n")
                    break
                
                # Submit new tasks to keep pool full
                while len(active_futures) < self.max_workers and self.stats.successful < target_questions:
                    schema_id = None
                    if self.systematic_config.mode == "systematic":
                        schema_id = self._get_next_available_schema(schema_progress, active_futures)
                        if not schema_id:
                            break  # No more schemas need work
                    
                    question_counter += 1
                    worker_id = ((question_counter - 1) % self.max_workers) + 1
                    
                    # Submit task
                    future = executor.submit(self._worker_task, worker_id, question_counter, target_questions, schema_id)
                    active_futures[future] = (question_counter, schema_id)
                
                if not active_futures:
                    break
                
                # Process completed tasks
                try:
                    # Wait for the next future to complete
                    for future in as_completed(active_futures.keys(), timeout=10):
                        question_num, used_schema_id = active_futures.pop(future)
                        
                        try:
                            result = future.result()
                            self.results.append(result)
                            
                            was_successful = result.get("success", False)
                            if was_successful:
                                consecutive_failures = 0
                                if self.systematic_config.mode == "systematic" and used_schema_id:
                                    with self.lock:
                                        schema_progress[used_schema_id]["successful"] += 1
                            else:
                                consecutive_failures += 1
                            
                            # Callbacks
                            if progress_callback:
                                progress_callback(self.stats.successful, target_questions)
                            
                            if status_callback:
                                callback_data = {
                                    "completed": question_counter,
                                    "total": target_questions,
                                    "successful": self.stats.successful,
                                    "failed": self.stats.failed,
                                    "consecutive_failures": consecutive_failures,
                                    "worker_status": {
                                        str(wid): {
                                            "state": s["state"],
                                            "schema": s["schema"],
                                            "stage": s["stage"],
                                            "message": s["message"]
                                        } for wid, s in self.worker_status.items()
                                    }
                                }
                                # Add systematic progress if in that mode
                                if self.systematic_config.mode == "systematic":
                                    callback_data["systematic"] = {
                                        "schema_progress": schema_progress
                                    }
                                status_callback(callback_data)
                                
                        except Exception as e:
                            print(f"Error retrieving result for question {question_num}: {e}")
                            consecutive_failures += 1
                        
                        # Break to re-fill pool
                        break
                        
                except Exception:
                    # Timeout or other error, loop again
                    pass
        
        self.stats.end_time = time.time()
        
        # Print summary
        print(f"\n{'='*70}")
        if self.stats.successful >= target_questions:
            print(f"Generation Complete - Target Reached!")
        elif consecutive_failures >= max_failures:
            print(f"Generation Stopped - Maximum Failures Reached")
        else:
            print(f"Generation Complete")
        print(f"{'='*70}")
        print(f"Target: {target_questions} successful questions")
        print(f"Total attempts: {self.stats.total_questions}")
        print(f"Successful: {self.stats.successful}")
        print(f"Failed: {self.stats.failed}")
        print(f"Duration: {self.stats.duration:.1f} seconds")
        
        # Analyze failure reasons
        if self.stats.failed > 0 and self.results:
            print(f"\nFailure Analysis:")
            failure_reasons = {}
            for result in self.results:
                if not result.get("success", False):
                    status = result.get("status", "unknown")
                    error = result.get("error", "")
                    
                    if "api key" in str(error).lower() or "403" in str(error):
                        category = "Auth Error"
                    elif "quota" in str(error).lower() or "429" in str(error):
                        category = "Rate Limit/Quota"
                    else:
                        category = status
                    
                    failure_reasons[category] = failure_reasons.get(category, 0) + 1
            
            for reason, count in sorted(failure_reasons.items(), key=lambda x: x[1], reverse=True):
                print(f"  - {reason}: {count}")
        
        print(f"{'='*70}\n")
        
        return self.results
















