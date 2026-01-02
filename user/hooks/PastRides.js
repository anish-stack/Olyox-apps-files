import { useEffect, useState } from "react"
import { fetchPastRidesData } from "../Ride/First_Step_screen/api"


const usePastRides = () => {
    const [rides, setRides] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')


    const fetchData = async () => {

        try {
            setLoading(true)
            const response = await fetchPastRidesData()
            if (response) {
                setRides(response)
            }

        } catch (error) {
            setError(error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchData()
    }, [])

    return { rides, loading, error, fetchData }

}

export default usePastRides;
